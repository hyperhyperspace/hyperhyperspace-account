import { MutableObject, MutableReference, Namespace, Resources, Identity, PeerSource, PeerInfo, Endpoint, Hash, HMACImpl } from 'hyper-hyper-space';

import { PeerGroupSync } from '../sync/PeerGroupSync';
import { SyncTarget } from '../sync/SyncTarget';

import { Device } from '../account/Device';

import { InviteToken } from './InviteToken';
import { InviteReply } from './InviteReply';

class PendingInviteDevices extends PeerGroupSync implements SyncTarget {

    inviteToken: InviteToken;

    namespace: Namespace;

    sender: MutableReference<Identity>;
    reply: MutableReference<InviteReply>;

    constructor(inviteToken: InviteToken) {
        super();

        this.inviteToken = inviteToken;
    }
    
    async init(resources: Resources) {
        if (this.resources === undefined) {
            await super.init(resources);

            this.namespace = new Namespace('pending-invite-for-token-' + this.inviteToken.hash());

            this.sender = new MutableReference<Identity>();
            this.namespace.define('sender', this.sender);
            this.sender.setResources(resources);

            this.reply = new MutableReference<InviteReply>();
            this.namespace.define('reply', this.reply);
            this.reply.setResources(resources);
        }
    } 


    getRootObjects(): IterableIterator<MutableObject> {
        return this.namespace.getAll();
    }

    async localSync() {
        await this.reply.loadAndWatchForChanges();
        await this.sender.loadAndWatchForChanges();
    }

    async sendInvite(sender: Identity) {
        await this.sender.setValue(sender);
        await this.sender.saveQueuedOps();
    }

    async waitForReply() {

        await this.sender.loadAllChanges();

    }

    async acceptInvite(receiver: Identity) {

    }

}

class PendingInvitePeerSource implements PeerSource {

    token: InviteToken;

    constructor(token: InviteToken) {
        this.token = token;
    }

    async getPeers(count: number): Promise<PeerInfo[]> {
        let peers = this.getInviteSenderPeers();

        if (peers.length > count) {
            peers = peers.slice(0, count);
        }

        return peers;
    }
    
    async getPeerForEndpoint(endpoint: string): Promise<PeerInfo | undefined> {
        

        for (const peer of this.getInviteSenderPeers()) {
            if (endpoint === peer.endpoint) {
                return peer;
            }
        }



        return undefined;

    }

    getInviteSenderPeers() : PeerInfo[] {

        let senderPeers: PeerInfo[] = [];

        for (const deviceRef of this.token.senderDevices.values()) {
            let ep = Device.endpointForDeviceHash(deviceRef.hash, this.token.senderLinkup);
            senderPeers.push({ endpoint: ep, identityHash: this.token.senderIdentityHash });
        }

        return senderPeers;
    }
    
    getInviteReceiverPeer(receiverHash: Hash) : PeerInfo {
        let ep = this.token.senderLinkup;
        if (!ep.endsWith('/')) {
            ep = ep + '/';
        }

        ep = ep + 'invite-reply/' + receiverHash + '/' + new HMACImpl().hmacSHA256hex(receiverHash, this.token.secret);

        return { endpoint: ep, identityHash: receiverHash};
    }

    getInviteReceiverPeerForEndpoint(ep: Endpoint) : PeerInfo | undefined {
        
        let parts = ep.split('/invite-reply/');
        if (parts.length !== 2) {
            return undefined;
        }

        parts = parts[1].split('/');

        if (parts.length !== 2) {
            return undefined;
        }

        if (parts[1] === new HMACImpl().hmacSHA256hex(parts[0], this.token.secret)) {
            return { endpoint: ep, identityHash: parts[0] }
        } else {
            return undefined;
        }
    }

}



export { PendingInviteDevices };