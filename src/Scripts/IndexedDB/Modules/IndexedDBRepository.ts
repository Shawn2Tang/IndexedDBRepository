///<reference path="./IRepositoryContext.d.ts" />
///<reference path="./IRepository.d.ts" />

export default class IndexedDBRepository implements IRepository {

    private commonStoreName: string = 'CommonStoreToCache';
    private commonStoreConfig: IIndexedDBStoreConfigMetadata = { keyPath: 'module_key' };
    private lr: {
        msgBrowserDoesNotSupportIndexedDB: 'Browser does not support indexedDB or disabled it.',
        msgCacheContextMissDatabase: 'Context does not contain database name.',
        msgCacheContextMissStoreName: 'Context does not contain store name.',
        msgOpenObjectStoreError: 'Error occurs when open object store.'
    }

    private idxDb: IDBFactory;

    constructor() {

        this.idxDb = window.indexedDB || window['mozIndexedDB'] || window['webkitIndexedDB'] || window['msIndexedDB'];
    }

    public persistObject(ctx: IRepositoryContext, item: Object): Promise<any> {
        
        return new Promise((resolve, reject)=>{

            this.open(ctx).then(
                
                db => {

                    const tx = db.transaction([this.commonStoreName], 'readwrite');
                    tx.oncomplete = evt => {

                        db && db.close();
                    };
                    tx.onerror = evt => {

                        db && db.close();
                    };

                    const store = tx.objectStore(this.commonStoreName);
                    if (store) {

                        const request = store.put({
                            module_key: ctx.module,
                            value: item
                        });

                        request.onsuccess = evt => {

                            resolve();
                        };

                        request.onerror = evt => {

                            reject(request.error);
                        }
                    }
                    else {

                        reject(new Error(this.lr.msgOpenObjectStoreError));
                    }
                },
                error => {

                    reject(error);
                });
        });
    }

    public persistStoreData(ctx: IRepositoryContext, items: Object[]): Promise<any> {
        
        return new Promise((resolve, reject)=>{

            if (!ctx
                || !ctx.storeName) {

                reject(new Error(this.lr.msgCacheContextMissStoreName));
            }

            this.open(ctx).then(

                db => {

                    const tx = db.transaction([ctx.storeName], 'readwrite');
                    tx.oncomplete = evt => {

                        db && db.close();
                        resolve();
                    };
                    tx.onerror = evt => {

                        db && db.close();
                        reject(tx.error);
                    };
                    
                    const store = tx.objectStore(ctx.storeName);
                    if (store) {

                        store.clear();
                        items.forEach(x => {

                            store.add(x);
                        });
                    }
                    else {

                        reject(new Error(this.lr.msgOpenObjectStoreError));
                    }
                },
                error => {
                    
                    reject(error);
                });
        });;
    }

    public restoreObjectAndRemove(ctx: IRepositoryContext): Promise<any> {
        
        return new Promise((resolve, reject)=>{

            this.open(ctx).then(

                db => {

                    const tx = db.transaction([this.commonStoreName], 'readwrite');
                    tx.oncomplete = evt => {

                        db && db.close();
                    };
                    tx.onerror = evt => {

                        db && db.close();
                    };

                    const store = tx.objectStore(this.commonStoreName);
                    if (store) {

                        const request = store.get(ctx.module);
                        request.onsuccess = evt => {

                            const result = request.result && request.result.value;

                            store.delete(ctx.module);                        
                            resolve(result);
                        };

                        request.onerror = evt => {

                            reject(request.error);
                        }
                    }
                    else {

                        reject(new Error(this.lr.msgOpenObjectStoreError));
                    }

                    resolve();
                },
                error => {

                    reject(error);
                });
        });
    }

    public restoreStoreDataAndRemove(ctx: IRepositoryContext): Promise<any> {
        
        return new Promise((resolve, reject)=>{

            if (!ctx
                || !ctx.storeName) {

                reject(new Error(this.lr.msgCacheContextMissStoreName));
            }

            this.open(ctx).then(

                db => {

                    const tx = db.transaction([ctx.storeName], 'readwrite');
                    tx.oncomplete = evt => {

                        db && db.close();
                    };
                    tx.onerror = evt => {

                        db && db.close();
                    };

                    const store = tx.objectStore(ctx.storeName);
                    if (store) {

                        const request = store.getAll();
                        request.onsuccess = evt => {

                            const result = request.result;
                            store.clear();
                            resolve(result);
                        };

                        request.onerror = evt => {

                            reject(request.error);
                        }
                    }
                    else {

                        reject(new Error(this.lr.msgOpenObjectStoreError));
                    }
                },
                error => {
                    
                    reject(error);
                });
        });
    }

    public destroy(database:string): Promise<any> {
        
        return new Promise((resolve, reject)=>{

            if (!this.idxDb) {

                const request = this.idxDb.deleteDatabase(database);

                request.onerror = evt => {

                    reject(request.error);
                };

                request.onsuccess = evt => {

                    resolve();
                };
            }
        });
    }

    private getStoresConfig(metadata:IIndexedDBConfigMetadata):IIndexedDBStoreMetadata[]{

        let stores:IIndexedDBStoreMetadata[]=[];

        if(metadata.stores
            && metadata.stores.length>0){

            metadata.stores.forEach(x=>{

                stores.push({
                    name:x.name,
                    config:{
                        keyPath: x.config && x.config.keyPath
                    }
                });
            });
        }

        stores.push({
            name:this.commonStoreName,
            config:this.commonStoreConfig
        });

        return stores;
    }

    public createIndexedDBAndStoreIfNotExists(metadata:IIndexedDBConfigMetadata): Promise<any>{
        
        return new Promise((resolve, reject)=>{

            if (!metadata
                || !metadata.database) {

                reject(new Error(this.lr.msgCacheContextMissDatabase));
            }

            if (!this.idxDb) {
                
                reject(new Error(this.lr.msgBrowserDoesNotSupportIndexedDB));
            }

            const stores = this.getStoresConfig(metadata);
            const request = this.idxDb.open(metadata.database);
            request.onsuccess=evt=>{

                const db = request.result;
                
                if( stores
                    && stores.length>0){
                    
                    const existStores=db.objectStoreNames;
                    const storeNames = stores.map(x=>x.name);
                    
                    if(storeNames.some(x=>!existStores.contains(x))){

                        const notExistStores=storeNames.filter(x=>!existStores.contains(x));
                        this.openAndCreateStores(metadata, notExistStores, db.version)
                        .then(db=>{

                            resolve(db);
                        })
                        .catch(error=>{

                            reject(error);
                        });
                    }
                    else{

                        resolve(db);
                    }
                }
                else{

                    resolve(db);
                }
            };

            request.onupgradeneeded = evt => {

                const db = request.result;

                if (db){
                    
                    stores.forEach(storeConfig=>{

                        if(storeConfig.name){

                            const storeName=storeConfig.name;
                            const config=storeConfig.config||{ autoIncrement: true };

                            !db.objectStoreNames.contains(storeName) && db.createObjectStore(storeName, config);
                        }
                    });
                }
            };
            request.onerror = evt => {

                reject(request.error);
            };
        });
    }

    private openAndCreateStores(metadata: IIndexedDBConfigMetadata, toCreateStores:string[], version:number): Promise<any>{
    
        return new Promise((resolve, reject)=>{

            const request = this.idxDb.open(metadata.database, version?version+1:1);
            request.onsuccess=evt=>{

                const db = request.result;
                return db;
            };
            request.onupgradeneeded = evt => {
                
                const db = request.result;

                if(toCreateStores
                    && toCreateStores.length>0
                    && metadata
                    && metadata.stores
                    && metadata.stores.length>0){

                        metadata.stores.forEach(store=>{

                            if(toCreateStores.indexOf(store.name)>-1){

                                !db.objectStoreNames.contains(store.name) && db.createObjectStore(store.name, store.config||{autoIncrement:true});
                            }
                        });
                    }
            };
            request.onerror = evt => {

                reject(request.error);
            };

        });
    }

    private open(ctx: IRepositoryContext): Promise<any> {
        
        return new Promise((resolve, reject)=>{
        
            if (!this.idxDb) {

                reject(new Error(this.lr.msgBrowserDoesNotSupportIndexedDB));
            }

            const request = this.idxDb.open(ctx.database);
            request.onsuccess=evt=>{

                const db = request.result;
                resolve(db);
            };

            request.onerror = evt => {

                reject(request.error);
            };
        });
    }
}