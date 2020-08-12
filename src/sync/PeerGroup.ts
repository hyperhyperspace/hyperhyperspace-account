import { PeerGroupInfo, Resources, Mesh } from 'hyper-hyper-space';
import { SharedNamespace } from './SharedNamespace';



abstract class PeerGroup {

    private namespaces:    Map<string, SharedNamespace>;
    private connected: boolean;

    constructor() {
        this.namespaces = new Map();
        this.connected = false;
    }

    abstract getPeerGroupInfo(): PeerGroupInfo;
    abstract getResources(): Resources;

    connect() {    
        this.getResources().mesh.joinPeerGroup(this.getPeerGroupInfo());

        for (const namespace of this.namespaces.values()) {
            this.syncNamespace(namespace);
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
        mesh.syncManyObjectsWithPeerGroup(this.getPeerGroupInfo().id, namespace.getAllObjects());
    }


}

export { PeerGroup };