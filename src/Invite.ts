import { HashedObject, MutableReference, Identity } from 'hyper-hyper-space';


class Invite extends HashedObject {

    static className = 'hhs-home/v0/Invite';

    intendedRecipient?: string;
    recipientIdentity?: MutableReference<Identity>;

    constructor(secret?: string, intendedRecipient?: string) {
        super();

        if (secret !== undefined) {
            this.setId(secret);
            this.intendedRecipient = intendedRecipient;
            this.addDerivedField('recipientIdentity', new MutableReference<Identity>());
        }
        
    }

    getClassName(): string {
        return Invite.className;
    }

    init(): void {
        
    }

    validate(references: Map<string, HashedObject>): boolean {
        return true;
    }

}

HashedObject.registerClass(Invite.className, Invite);

export { Invite };