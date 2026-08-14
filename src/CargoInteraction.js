import * as THREE from 'three';

const PICK_RADIUS = 3;
const PLACE_RADIUS = 3;
const TRUCK_RADIUS = 3;
const GRAVITY = 18;
const GROUND_Y = 2;

export class CargoInteraction {
  constructor({ crane, cargoAreas, truck, scene, promptElement }) {
    this.crane = crane;
    this.cargoAreas = cargoAreas;
    this.truck = truck;
    this.scene = scene;
    this.promptElement = promptElement;
    this.looseCargos = [];
    this.falling = [];
    this.pickTarget = null;
    this.placeTarget = null;
    this.truckTarget = false;
  }

  update(deltaTime) {
    this.updateFalling(deltaTime);
    this.refreshTargets();
    this.updatePrompt();
  }

  refreshTargets() {
    this.pickTarget = null;
    this.placeTarget = null;
    this.truckTarget = false;

    const spreaderPosition = this.crane.getSpreaderWorldPosition();

    if (!spreaderPosition) {
      return;
    }

    if (this.crane.heldCargo) {
      this.placeTarget = this.findNearestPlaceSlot(spreaderPosition);
      this.truckTarget = this.isTruckInRange(spreaderPosition);
      return;
    }

    this.pickTarget = this.findNearestPickable(spreaderPosition);
  }

  findNearestPickable(spreaderPosition) {
    let nearest = null;
    let nearestDistance = PICK_RADIUS;

    for (const slots of Object.values(this.cargoAreas)) {
      for (const [slotId, slot] of slots.slots) {
        if (slot.stack.length === 0) {
          continue;
        }

        const position = slots.getTopWorldPosition(slotId);
        const distance = spreaderPosition.distanceTo(position);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { type: 'slot', slots, slotId };
        }
      }
    }

    this.looseCargos.forEach((cargo) => {
      cargo.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(cargo);
      const center = box.getCenter(new THREE.Vector3());
      const distance = spreaderPosition.distanceTo(center);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { type: 'loose', cargo };
      }
    });

    return nearest;
  }

  findNearestPlaceSlot(spreaderPosition) {
    let nearest = null;
    let nearestDistance = PLACE_RADIUS;
    const areas = [this.cargoAreas.ship, this.cargoAreas.dock];

    areas.forEach((slots) => {
      for (const [slotId, slot] of slots.slots) {
        if (slot.stack.length >= slots.maxStack) {
          continue;
        }

        const position = slots.getPlaceWorldPosition(slotId);
        const distance = spreaderPosition.distanceTo(position);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { slots, slotId };
        }
      }
    });

    return nearest;
  }

  isTruckInRange(spreaderPosition) {
    if (this.truck.state !== 'parked') {
      return false;
    }

    if (!this.cargoAreas.truck.hasRoom('T1')) {
      return false;
    }

    this.truck.cargoRoot.updateMatrixWorld(true);
    const position = this.truck.cargoRoot.getWorldPosition(new THREE.Vector3());
    return spreaderPosition.distanceTo(position) <= TRUCK_RADIUS;
  }

  updatePrompt() {
    if (!this.promptElement) {
      return;
    }

    if (this.crane.heldCargo) {
      if (this.truckTarget) {
        this.showPrompt('Press C to load onto the truck');
        return;
      }

      if (this.placeTarget) {
        this.showPrompt('Press E to place the container');
        return;
      }

      this.hidePrompt();
      return;
    }

    if (this.pickTarget) {
      this.showPrompt('Press E to load the container');
      return;
    }

    this.hidePrompt();
  }

  showPrompt(text) {
    this.promptElement.textContent = text;
    this.promptElement.hidden = false;
  }

  hidePrompt() {
    this.promptElement.hidden = true;
  }

  tryUseE() {
    if (this.crane.heldCargo) {
      this.tryPlace();
    } else {
      this.tryPick();
    }
  }

  tryPick() {
    if (this.crane.heldCargo || !this.pickTarget) {
      return;
    }

    let cargo = null;

    if (this.pickTarget.type === 'slot') {
      cargo = this.pickTarget.slots.remove(this.pickTarget.slotId);
    } else {
      cargo = this.pickTarget.cargo;
      this.looseCargos = this.looseCargos.filter((item) => item !== cargo);
      cargo.removeFromParent();
    }

    if (cargo) {
      this.crane.attachCargo(cargo);
    }

    this.refreshTargets();
    this.updatePrompt();
  }

  tryPlace() {
    if (!this.crane.heldCargo || !this.placeTarget) {
      return;
    }

    const cargo = this.crane.detachCargo();
    this.placeTarget.slots.place(cargo, this.placeTarget.slotId);
    this.refreshTargets();
    this.updatePrompt();
  }

  tryLoadTruck() {
    if (!this.crane.heldCargo || !this.truckTarget) {
      return;
    }

    const cargo = this.crane.detachCargo();
    this.cargoAreas.truck.place(cargo, 'T1');
    this.refreshTargets();
    this.updatePrompt();
  }

  tryDrop() {
    if (!this.crane.heldCargo) {
      return;
    }

    const cargo = this.crane.detachCargo();
    this.scene.add(cargo);
    this.falling.push({ cargo, velocityY: 0 });
    this.refreshTargets();
    this.updatePrompt();
  }

  updateFalling(deltaTime) {
    const stillFalling = [];

    this.falling.forEach((item) => {
      item.velocityY -= GRAVITY * deltaTime;
      item.cargo.position.y += item.velocityY * deltaTime;

      if (item.cargo.position.y <= GROUND_Y) {
        item.cargo.position.y = GROUND_Y;
        this.looseCargos.push(item.cargo);
      } else {
        stillFalling.push(item);
      }
    });

    this.falling = stillFalling;
  }
}
