import { Mesh, PeerInfo, PeerSource } from 'hyper-hyper-space';
import { MutableObject } from 'hyper-hyper-space';

abstract class PeerGroupSync {

    abstract getMesh()        : Mesh;
    abstract getLocalPeer()   : PeerInfo;
    abstract getPeerSource()  : PeerSource;
    abstract getPeerGroupId() : string;

    connect() {
        
        let peerGroup = { id:         this.getPeerGroupId(),
                          localPeer:  this.getLocalPeer(),
                          peerSource: this.getPeerSource()
                        }

        this.getMesh().joinPeerGroup(peerGroup);
    }

    disconnect() {
        // TODO
    }

    add(mut: MutableObject, recursive=true, gossipId?: string) {
        this.getMesh().syncObjectWithPeerGroup(this.getPeerGroupId(), mut, recursive, gossipId);
    }

    addAll(muts: IterableIterator<MutableObject>, recursive=true, gossipId?: string) {
        this.getMesh().syncManyObjectsWithPeerGroup(this.getPeerGroupId(), muts, recursive, gossipId)
    }

}

export { PeerGroupSync }