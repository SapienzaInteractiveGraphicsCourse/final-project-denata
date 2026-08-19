import * as THREE from 'three';

const PICK_RADIUS = 3;
const PLACE_RADIUS = 3;
const TRUCK_RADIUS = 3;

export class CargoInteraction {
  constructor({ crane, cargoAreas, truck, scene, physics, promptElement, blockerElement }) {
    this.crane = crane;
    this.cargoAreas = cargoAreas;
    this.truck = truck;
    this.scene = scene;
    this.physics = physics;
    this.promptElement = promptElement;
    this.blockerElement = blockerElement;
    this.pickTarget = null;
    this.placeTarget = null;
    this.truckTarget = false;

    this.physics.onKnockFree = (cargo) => this.knockFree(cargo);
  }

  update() {
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
    const candidates = [];

    for (const slots of Object.values(this.cargoAreas)) {
      for (const [slotId, slot] of slots.slots) {
        if (slot.stack.length === 0) {
          continue;
        }

        const cargo = slots.peek(slotId);
        const distance = this.distanceToCargo(spreaderPosition, cargo);

        if (distance < PICK_RADIUS) {
          candidates.push({
            distance,
            type: 'slot',
            slots,
            slotId,
            cargo,
            ignore: slot.stack
          });
        }
      }
    }

    this.physics.getFreeCargos().forEach((cargo) => {
      const distance = this.distanceToCargo(spreaderPosition, cargo);

      if (distance < PICK_RADIUS) {
        candidates.push({ distance, type: 'loose', cargo, ignore: [] });
      }
    });

    candidates.sort((left, right) => left.distance - right.distance);

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];

      if (!this.hangsClear(candidate.cargo, candidate.ignore)) {
        continue;
      }

      if (candidate.type === 'slot') {
        return {
          type: 'slot',
          slots: candidate.slots,
          slotId: candidate.slotId
        };
      }

      return { type: 'loose', cargo: candidate.cargo };
    }

    return null;
  }

  distanceToCargo(spreaderPosition, cargo) {
    if (!cargo) {
      return Infinity;
    }

    cargo.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cargo);
    const overFootprint = spreaderPosition.x >= box.min.x
      && spreaderPosition.x <= box.max.x
      && spreaderPosition.z >= box.min.z
      && spreaderPosition.z <= box.max.z;

    if (!overFootprint || spreaderPosition.y < box.max.y - 0.05) {
      return Infinity;
    }

    return spreaderPosition.y - box.max.y;
  }

  // Preview lifting the cargo to the hook with its current footprint.
  // Ignores the pile it comes from so the stack below does not hide E.
  hangsClear(cargo, ignoreOthers = []) {
    if (!cargo || !this.crane.cargoAnchor || this.crane.heldCargo) {
      return false;
    }

    cargo.updateMatrixWorld(true);
    const currentBox = new THREE.Box3().setFromObject(cargo);
    const hook = this.crane.cargoAnchor.getWorldPosition(new THREE.Vector3());
    const center = currentBox.getCenter(new THREE.Vector3());
    const hungBox = currentBox.clone();
    hungBox.translate(new THREE.Vector3(
      hook.x - center.x,
      hook.y - currentBox.max.y,
      hook.z - center.z
    ));

    const ignore = new Set(ignoreOthers);
    ignore.add(cargo);
    return !this.physics.boxOverlapsOthers(hungBox, ignore);
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

    if (this.blockerElement && !this.blockerElement.hidden) {
      this.hidePrompt();
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
    let pickedFromTruck = false;

    if (this.pickTarget.type === 'slot') {
      pickedFromTruck = this.pickTarget.slots === this.cargoAreas.truck;
      cargo = this.pickTarget.slots.peek(this.pickTarget.slotId);
      const stack = this.pickTarget.slots.slots.get(this.pickTarget.slotId)?.stack ?? [];

      if (!this.hangsClear(cargo, stack)) {
        return;
      }

      cargo = this.pickTarget.slots.remove(this.pickTarget.slotId);
    } else {
      cargo = this.pickTarget.cargo;

      if (!this.hangsClear(cargo)) {
        return;
      }
    }

    if (cargo) {
      this.crane.attachCargo(cargo);
      this.physics.setHeld(cargo);

      if (pickedFromTruck) {
        this.truck.scheduleDeparture();
      }
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
    cargo.userData.knockable = this.placeTarget.slots !== this.cargoAreas.ship;
    this.physics.setSlotted(cargo);
    this.refreshTargets();
    this.updatePrompt();
  }

  tryLoadTruck() {
    if (!this.crane.heldCargo || !this.truckTarget) {
      return;
    }

    const cargo = this.crane.detachCargo();
    if (this.cargoAreas.truck.place(cargo, 'T1')) {
      cargo.userData.knockable = true;
      this.physics.setSlotted(cargo);
      this.truck.scheduleDeparture();
    }
    this.refreshTargets();
    this.updatePrompt();
  }

  tryDrop() {
    if (!this.crane.heldCargo) {
      return;
    }

    const cargo = this.crane.detachCargo();
    this.physics.setFree(cargo);
    this.refreshTargets();
    this.updatePrompt();
  }

  knockFree(cargo) {
    if (cargo.userData.physicsState !== 'slotted') {
      return;
    }

    if (cargo.userData.knockable === false) {
      return;
    }

    for (const slots of Object.values(this.cargoAreas)) {
      for (const [slotId, slot] of slots.slots) {
        if (!slot.stack.includes(cargo)) {
          continue;
        }

        const top = slots.peek(slotId);
        this.scene.attach(top);
        slot.stack.pop();
        this.physics.setFree(top);
        return;
      }
    }
  }
}
