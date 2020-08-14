import { Resources, MutableObject, Namespace, MutableReference, Identity } from 'hyper-hyper-space';

import { SharedNamespace } from '../../sync/SharedNamespace';

import { InviteToken } from '../data/InviteToken';
import { InviteReply } from '../data/InviteReply';


class PendingInviteInfo implements SharedNamespace {

    inviteToken: InviteToken;

    namespace: Namespace;

    sender?: MutableReference<Identity>;
    reply?: MutableReference<InviteReply>;

    constructor(inviteToken: InviteToken) {
        this.inviteToken = inviteToken;

        this.namespace = new Namespace('pending-invite-info-for-' + inviteToken.hash());
    }

    id(): string {
        return this.namespace.id;
    }

    async init(resources: Resources) {
        
        this.sender = new MutableReference<Identity>();
        this.sender.setResources(resources);
        this.namespace.define('sender', this.sender);

        this.reply = new MutableReference<InviteReply>();
        this.reply.setResources(resources);
        this.namespace.define('reply', this.reply);

    }

    get(name: string): MutableObject | undefined {
        return this.namespace.get(name);
    }

    getAllObjects(): IterableIterator<MutableObject> {
        return this.namespace.getAll();
    }

    getSender(): MutableReference<Identity> {
        if (this.sender === undefined) {
            throw new Error('PendingInviteInfo has not been initialized, sender is undefined');
        } else {
            return this.sender;
        }
    }

    getReply(): MutableReference<InviteReply> {
        if (this.reply === undefined) {
            throw new Error('PendingInviteInfo has not been initialized, reply is undefined');
        } else { 
            return this.reply;
        }
    }
    
}

export { PendingInviteInfo }