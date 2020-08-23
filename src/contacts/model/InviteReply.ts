import { HashedObject, Identity } from 'hhs';
import { HMACImpl } from 'hhs';


class InviteReply extends HashedObject {

    static className = 'hhs-home/v0/InviteReply';

    receiverIdentity?: Identity;
    hmac?: string;

    constructor(receiverIdentity?: Identity, secret?: string) {
        super();

        if (receiverIdentity !== undefined) {
            this.receiverIdentity = receiverIdentity;
            this.hmac = new HMACImpl().hmacSHA256hex(this.receiverIdentity?.hash(), secret as string);
        }

    }

    init(): void {
        
    }
    
    validate(references: Map<string, HashedObject>): boolean {
        references;

        return this.receiverIdentity !== undefined && this.receiverIdentity instanceof Identity &&
               this.hmac !== undefined && typeof(this.hmac) === 'string';
    }

    getClassName(): string {
        return InviteReply.className;
    }

}

HashedObject.registerClass(InviteReply.className, InviteReply);

export { InviteReply };