import { MutableObject, Resources } from 'hyper-hyper-space';


interface SharedNamespace {

    id(): string;

    init(resources: Resources): Promise<void>;

    get(name: string): MutableObject | undefined;
    getAllObjects(): IterableIterator<MutableObject>;

}

export { SharedNamespace }