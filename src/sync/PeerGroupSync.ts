import { PeerGroup, Resources, MutableObject } from 'hyper-hyper-space';
import { SyncTarget } from './SyncTarget';



class PeerGroupSync {

    protected resources?: Resources;
    protected peerGroup?: PeerGroup;
    private targets:    SyncTarget[];

    constructor() {
        this.targets = [];
    }

    protected async init(resources: Resources) {
        if (resources === undefined) {
            this.resources = resources;
        }
    }

    protected sync(peerGroup: PeerGroup) {

        if (this.resources === undefined) {
            throw new Error('Cannot start sync, init() has not been called.');
        }

        this.peerGroup = peerGroup;
        this.resources.mesh.joinPeerGroup(this.peerGroup);

        for (const target of this.targets) {
            this.syncObjects(target.getRootObjects());
        }
    }

    addSyncTarget(target: SyncTarget) {
        this.targets.push(target);
        if (this.peerGroup !== undefined) {
            this.syncObjects(target.getRootObjects());
        }
    }

    private syncObjects(muts: IterableIterator<MutableObject>) {
        this.resources?.mesh.syncManyObjectsWithPeerGroup(this.peerGroup.id, muts);
    }


}

export { PeerGroupSync };