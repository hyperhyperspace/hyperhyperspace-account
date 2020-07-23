import { HashedObject, Identity, MutableSet } from 'hyper-hyper-space';
import { Device } from './Device';


class Contact extends HashedObject {

    static className = 'hhs-home/v0/InviteReply';

    identity?: Identity;
    devices?: MutableSet<Device>;

    constructor(identity?: Identity) {
        super();

        if (identity !== undefined) {
            this.identity = identity;
            this.setId('contact-for-' + identity.hash());
            this.addDerivedField('devices', new MutableSet<Device>());
        }

    }
    
    getClassName(): string {
        return Contact.className;
    }

    init(): void {
        
    }

    validate(references: Map<string, HashedObject>): boolean {
        return this.identity !== undefined && this.checkDerivedField('devices') ;
    } 

}

HashedObject.registerClass(Contact.className, Contact);

export { Contact }