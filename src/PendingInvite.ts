import { HashedObject, Hash, RNGImpl } from 'hyper-hyper-space';
import { Invite } from './Invite';

const BITS_FOR_SECRET = 32;

class PendingInvite extends HashedObject {

    static className = 'hhs-home/v0/PendingInvite';

    invite?: Invite;

    intendedRecipient?: string;
    timestamp?: number;

    constructor(sender?: Hash, intendedRecipient?: string) {
        super();

        if (sender !== undefined) {
            this.invite = new Invite(sender, new RNGImpl().randomHexString(BITS_FOR_SECRET));
            this.intendedRecipient = intendedRecipient;
            this.timestamp = Date.now();
        }
    }

    init(): void {
        
    }

    validate(references: Map<string, HashedObject>): boolean {
        return this.invite !== undefined && this.invite instanceof Invite &&
               this.intendedRecipient !== undefined && typeof(this.intendedRecipient) === 'string' &&
               this.timestamp !== undefined && typeof(this.timestamp) === 'string';
    }

    getClassName(): string {
        return PendingInvite.className;
    }
}

HashedObject.registerClass(PendingInvite.className, PendingInvite);

export { PendingInvite };