const { createRxDatabase } = require('rxdb');
const { wrappedKeyEncryptionCryptoJsStorage } = require('rxdb/plugins/encryption-crypto-js');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
const { addRxPlugin } = require('rxdb');
const { RxDBJsonDumpPlugin } = require('rxdb/plugins/json-dump');
addRxPlugin(RxDBJsonDumpPlugin);
const fs = require('fs');
const filePath = './data.txt';
const encryptionKey = 'd7049890ddc4d68c94e5e563e4caf66e6335380da58e4aa1a876a2b3955fb05d';
const iv = 'cf1eb419c660488c3c3e1727f9d87ac0';
const crypto = require("crypto")


let myDatabase;


async function _exportDB() {
    console.log('before export')
    const jsonData = await myDatabase.exportJSON()
    console.log('after export')
    const encryptedJSON = _encryptJson(jsonData, encryptionKey, iv)
    console.log('after encryption')
    fs.writeFileSync(filePath, encryptedJSON, 'utf8')
    console.log('after write')
    
}

async function _importDB() {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8')
        if (fileContent) {
            const data = _decryptJson(fileContent, encryptionKey, iv)
            await myDatabase.importJSON(data)
        }
    } catch (e) {
        console.log(e)
    }
}

async function _initDB() {

    myDatabase = await createRxDatabase({
        name: 'mydatabase',
        storage: wrappedKeyEncryptionCryptoJsStorage({
            storage: getRxStorageMemory()
        }),
        password: 'myPass12345',
        hashFunction: _nativeSha256
    });
}

async function _nativeSha256(input) {
    var data = new TextEncoder().encode(input);
    /**
     * If your JavaScript runtime does not support crypto.subtle.digest,
     * provide your own hash function when calling createRxDatabase().
     */

    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    /**
     * @link https://jameshfisher.com/2017/10/30/web-cryptography-api-hello-world/
     */
    var hash = Array.prototype.map.call(new Uint8Array(hashBuffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    return hash;
}

function _encryptJson(data, key, iv) {
    const jsonString = JSON.stringify(data, null, 2);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function _decryptJson(encryptedData, key, iv) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

async function _addTodoSchema() {
    const todoSchema = {
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: {
                type: 'string',
                maxLength: 100 // <- the primary key must have set maxLength
            },
            name: {
                type: 'string'
            },
            done: {
                type: 'boolean'
            },
            meta: {
                type: 'object'
            },
            timestamp: {
                type: 'string',
                format: 'date-time'
            }
        },
        encrypted: ['name', 'meta'],
        required: ['id', 'name', 'done', 'timestamp']
    }

    const collection = await myDatabase.addCollections({
        todos: {
            schema: todoSchema
        }
    });
}

async function _insertToDB({ id = '1', name = 'Todo 1', done = false, meta = { s1: '1', s2: '2' } }) {
    const myDocument = await myDatabase.todos.insert({
        id,
        name,
        done,
        meta,
        timestamp: new Date().toISOString()
    });
}

async function _bulkInsertToDB(data) {
    const myDocument = await myDatabase.todos.bulkInsert(data);
}

async function _getAllDocs(verbose = false) {
    const foundDocuments = await myDatabase.todos.find().exec();
    if (verbose) {

        foundDocuments.forEach(doc => console.log(doc._data))
    }
}

async function run() {
    await _initDB()
    await _addTodoSchema()
    await _importDB()
    await _getAllDocs()
    // console.time('insertSingle')
    // for (let i = 0; i < 500000; i++) {
    //     console.log(i)
    //     await _insertToDB({ id: "" + i, name: 'Todo' + i, done: false, meta: { s1: "SA" + i, s2: "SB" + i } })
    // }
    // console.timeEnd('insertSingle')

    console.time('insertBulk')
    const data = []
    for (let i = 0; i < 50000; i++) {
        if(i%10000 == 0) console.log(i)
        data.push({ id: "" + i, name: 'Todo' + i, done: false, meta: { s1: "SA" + i, s2: "SB" + i } })
    }
    console.log('beforeInsert')
    await _bulkInsertToDB(data)
    console.timeEnd('insertBulk')

    // await _getAllDocs()
    console.time('export')
    await _exportDB()
    console.timeEnd('export')
}

run()