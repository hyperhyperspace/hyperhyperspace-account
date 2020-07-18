import { HashedObject, Identity, MutableSet } from 'hyper-hyper-space';
import { Device } from './Device';


class Contact extends HashedObject {

    identity: Identity;
    devices: MutableSet<Device>;

    constructor(identity?: Identity) {
        super();


    }

    
    getClassName(): string {
        throw new Error("Method not implemented.");
    }
    init(): void {
        throw new Error("Method not implemented.");
    }
    validate(references: Map<string, HashedObject>): boolean {
        throw new Error("Method not implemented.");
    } 

}

export { Contact }