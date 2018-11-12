///<reference path="./IRepositoryContext.d.ts" />
///<reference path="./IIndexedDBStoreConfigMetadata.d.ts" />

export default class RepositoryContext implements IRepositoryContext {

    private _database: string;
    private _module: string;

    get database(): string {
        return this._database;
    }

    set database(value: string) {
        this._database = value;
    }

    get module(): string {
        return this._module;
    }

    set module(value: string) {
        this._module = value;
    }

    get storeName(): string {
        return this._storeName;
    }

    set storeName(value: string) {
        this._storeName = value;
    }
}