import { MutableObject } from 'hyper-hyper-space';


interface SyncTarget {

    getObjects(): IterableIterator<MutableObject>;

}

export { SyncTarget }