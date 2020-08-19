import { Resources, Hash, HashedObject, SyncMode, Mesh } from 'hyper-hyper-space';
import { AccountDevicesPeerGroup } from '../peers/AccountDevicesPeerGroup';


/* AccountDevicesSync: Uses the mesh to sync info in the local store amongst all the devices
                       in this account. By default it synchronizes only the account devices 
                       information. Other modules may use it to synchronize other objects.
 */


class AccountDevicesSync {

    ownerIdentityHash: Hash;
    localDeviceHash?: Hash;

    resources?: Resources;

    peerGroup?: AccountDevicesPeerGroup;

    syncTargets: Map<Hash, HashedObject>;
    syncModes: Map<Hash, SyncMode>;
    started: boolean;

    constructor(ownerIdentityHash: Hash, localDeviceHash?: Hash) {
        this.ownerIdentityHash = ownerIdentityHash;
        this.localDeviceHash   = localDeviceHash;

        this.syncTargets = new Map();
        this.syncModes   = new Map();
        this.started = false;
    }

    async init(resources: Resources) {

        if (this.resources === undefined) {
            this.resources = resources;
            this.peerGroup = new AccountDevicesPeerGroup(this.ownerIdentityHash, this.localDeviceHash);
            
            await this.peerGroup.init(resources);
        }
    }

    async start() {

        if (this.resources === undefined) {
            throw new Error('AccountDevicesSync cannot be started because it has not been initialized.');
        }

        if (!this.started) {

            this.resources.mesh.joinPeerGroup(await this.peerGroup?.getPeerGroupInfo());
            this.started = true;

            for (const [hash, obj] of this.syncTargets.entries()) {
                let mode = this.syncModes.get(hash) as SyncMode;
                this.configureMeshSync(obj, mode);
            }

            this.sync(this.peerGroup?.accountDevices as HashedObject, SyncMode.recursive);
        }
        
    }

    sync(obj: HashedObject, mode: SyncMode) {

        const hash = obj.hash();

        this.syncTargets.set(hash, obj);
        this.syncModes.set(hash, mode);

        if (this.started) {
            this.configureMeshSync(obj, mode);
        }
    }

    private configureMeshSync(obj: HashedObject, mode: SyncMode) {
        let mesh = this.resources?.mesh as Mesh;
        let peerGroupId = this.peerGroup?.peerGroupId as string;

        mesh.syncObjectWithPeerGroup(peerGroupId, obj, mode);
    }

}

export { AccountDevicesSync };