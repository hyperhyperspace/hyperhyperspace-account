import { HashedObject, Identity } from 'hyper-hyper-space';


class InviteReply extends HashedObject {

    static className = 'hhs-home/v0/InviteReply';

    receiverIdentity?: Identity;
    hmac?: string;

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