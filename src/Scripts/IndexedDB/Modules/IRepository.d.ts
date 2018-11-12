///<reference path='./IIndexedDBConfigMetadata.d.ts' />
///<reference path='./IRepositoryContext.d.ts' />

interface IRepository {

    createIndexedDBAndStoreIfNotExists:(metadata:IIndexedDBConfigMetadata)=>Promise<boolean>;

    // Persist object into client cache
    persistObject: (key: IRepositoryContext, item: Object) => Promise<Object>;

    // Restore object from client cache
    restoreObjectAndRemove: (key: IRepositoryContext) => Promise<Object>;

    // Persist an array of object into clinet cache
    persistStoreData: (key: IRepositoryContext, items: Object[]) => Promise<Object[]>;

    // Restore an arrary of objects from client cache
    restoreStoreDataAndRemove: (key: IRepositoryContext) => Promise<Object[]>;

    // clear client cache
    destroy: (database:string) => Promise<{}>;
}