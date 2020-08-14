import { HashedObject, Identity } from 'hyper-hyper-space';
import { Device } from '../../account/data/Device';
import { InviteToken } from './InviteToken';



class Invite extends HashedObject {

    static className = 'hhs-home/v0/Invite';

    token?              : InviteToken;

    intendedRecipient?  : string;
    timestamp?          : number;

    constructor(sender?: Identity, devices?: IterableIterator<Device>, recipient?: string) {
        super();

        if (sender !== undefined) {
            this.token = new InviteToken(sender, devices);
            this.intendedRecipient = recipient;
            this.timestamp = Date.now();
        }
    }


    init(): void {
        
    }

    validate(references: Map<string, HashedObject>): boolean {
        references;

        return this.token !== undefined && this.token instanceof InviteToken && 
               this.intendedRecipient !== undefined && typeof(this.intendedRecipient) === 'string' &&
               this.timestamp !== undefined && typeof(this.timestamp) === 'number';
    }

    getClassName(): string {
        return Invite.className;
    }

}

HashedObject.registerClass(Invite.className, Invite);

export { Invite };