import { HashedObject, Identity } from 'hyper-hyper-space';


class InviteReply extends HashedObject {

    static className = 'hhs-home/v0/InviteReply';

    receiverIdentity?: Identity;
    hmac: string;

    constructor(receiverIdentity?: Identity, hmac?: string) {
        super();

        if (receiverIdentity !== undefined) {
            this.receiverIdentity = receiverIdentity;
            this.hmac = hmac;
        }
    }

    init(): void {
        
    }

    validate(references: Map<string, HashedObject>): boolean {
        return true;
    }

    getClassName(): string {
        return InviteReply.className;
    }

    

}

HashedObject.registerClass(InviteReply.className, InviteReply);

export { InviteReply }