import { PeerGroupSync, Resources } from 'hhs';


abstract class Module {

    private peerGroupSyncs: Set<PeerGroupSync>;
    private syncIsActive: boolean;

    constructor() {
        this.peerGroupSyncs = new Set();
        this.syncIsActive = false;
    }

    abstract init(resources: Resources): Promise<void>;

    async start() {

        if (!this.syncIsActive) {
            this.syncIsActive = true;
            for (const s of this.peerGroupSyncs.values()) {
                if (!this.syncIsActive) { break; }
                await s.start();
            }
        }
        

    }

    async stop() {

        if (this.syncIsActive) {
            this.syncIsActive = false;
            for (const s of this.peerGroupSyncs.values()) {
                if (this.syncIsActive) { break; }
                await s.stop();
            }

        }

    }

    protected async addModuleSync(s: PeerGroupSync) {
        this.peerGroupSyncs.add(s);
        if (this.syncIsActive) {
            await s.start();
        }
    }

    protected async removeModuleSync(s: PeerGroupSync) {
        if (this.peerGroupSyncs.has(s)) {
            this.peerGroupSyncs.delete(s);
            if (this.syncIsActive) {
                await s.stop();
            }
        }
    }

}

export { Module };