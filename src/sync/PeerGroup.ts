import { PeerGroupInfo, Resources, PeerInfo, PeerSource } from 'hyper-hyper-space';
import { SharedNamespace } from './SharedNamespace';



abstract class PeerGroup {

    private namespaces:    Map<string, SharedNamespace>;
    private connected: boolean;

    constructor() {
        this.namespaces = new Map();
        this.connected = false;
    }

    abstract getResources(): Resources;

    abstract getPeerGroupId(): string;
    abstract getLocalPeer(): Promise<PeerInfo>;
    abstract getPeerSource(): Promise<PeerSource>;

    async getPeerGroupInfo(): Promise<PeerGroupInfo> {
        return {
            id         : this.getPeerGroupId(),
            localPeer  : await this.getLocalPeer(),
            peerSource : await this.getPeerSource()
        };
    }

    connect() {   
        
        if (!this.connected) {
            this.getResources().mesh.joinPeerGroup(this.getPeerGroupInfo());

            for (const namespace of this.namespaces.values()) {
                this.syncNamespace(namespace);
            }

            this.connected = true;
        }

    }

    addSyncTarget(namespace: SharedNamespace) {
        if (!this.namespaces.has(namespace.id())) {
            this.namespaces.set(namespace.id(), namespace);
            if (this.connected) {
                const mesh = this.getResources().mesh;
                mesh.syncNamespace(namespace);
            }
        }
    }

    private syncNamespace(namespace: SharedNamespace) {
        let mesh = this.getResources().mesh; 
        mesh.syncManyObjectsWithPeerGroup(this.getPeerGroupId(), namespace.getAllObjects());
    }


}

export { PeerGroup };