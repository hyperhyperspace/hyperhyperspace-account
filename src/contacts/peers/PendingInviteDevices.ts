import { Resources, PeerSource, Identity, PeerInfo } from 'hyper-hyper-space';

import { PeerGroup } from '../../sync/PeerGroup';
import { InviteToken } from '../data/InviteToken';
import { AccountDevices } from '../../account/peers/AccountDevices';


class PendingInviteDevices extends PeerGroup {

    inviteToken: InviteToken;

    private sender?: boolean;

    // only present if we are the sender of the invite:
    senderAccountDevices?: AccountDevices;

    // only present if we are the receiver:
    receiverIdentity?: Identity;

    resources?: Resources;

    constructor(inviteToken: InviteToken) {
        super();

        this.inviteToken = inviteToken;

    }

    forInviteSender(senderAccountDevices: AccountDevices) {
        
        this.sender = true;
        this.senderAccountDevices = senderAccountDevices;
        this.receiverIdentity     = undefined;
    }

    forInviteReceiver(receiverIdentity: Identity) {

        this.sender = false;
        this.senderAccountDevices = undefined;
        this.receiverIdentity     = receiverIdentity;
    }

    init(resources: Resources) {
        this.resources = resources;
    }

    getResources(): Resources {
        if (this.resources === undefined) {
            throw new Error('PendingInviteDevices is not initialized, resources is undefined.');
        } else {
            return this.resources;
        }
    }

    getPeerGroupId(): string {
        throw new Error("Method not implemented.");
    }

    getLocalPeer(): Promise<import("hyper-hyper-space/decl/mesh/agents/peer/PeerGroupAgent").PeerInfo> {
        throw new Error("Method not implemented.");
    }

    getPeerSource(): Promise<import("hyper-hyper-space/decl/mesh/agents/peer/PeerSource").PeerSource> {
        throw new Error("Method not implemented.");
    }
    
}

class PendingInvitePeers implements PeerSource {

    pendingInviteDevices: PendingInviteDevices;

    constructor(pendingInviteDevices: PendingInviteDevices) {
        this.pendingInviteDevices = pendingInviteDevices;
    }

    getPeers(count: number): Promise<PeerInfo[]> {
        throw new Error("Method not implemented.");
    }

    getPeerForEndpoint(endpoint: string): Promise<PeerInfo> {
        throw new Error("Method not implemented.");
    }



}

export { PendingInviteDevices };