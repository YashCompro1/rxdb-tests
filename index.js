const { createRxDatabase } = require('rxdb');
const { wrappedKeyEncryptionCryptoJsStorage } = require('rxdb/plugins/encryption-crypto-js');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
const { wrappedValidateAjvStorage } = require('rxdb/plugins/validate-ajv');
const { addRxPlugin } = require('rxdb');
const { RxDBJsonDumpPlugin } = require('rxdb/plugins/json-dump');
addRxPlugin(RxDBJsonDumpPlugin);
const fs = require('fs');
const filePath = './data.json';
const encryptionKey = 'd7049890ddc4d68c94e5e563e4caf66e6335380da58e4aa1a876a2b3955fb05d';
const iv = 'cf1eb419c660488c3c3e1727f9d87ac0';

const crypto = require("crypto")
let myDatabase;

async function start() {

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


    console.log('Create todoSchema')
    // console.log(todoSchema)

    const collection = await myDatabase.addCollections({
        todos: {
            schema: todoSchema
        }
    });

    console.log('Create collection')
    // console.log(collection)

    const myDocument = await myDatabase.todos.insert({
        id: 'todo1',
        name: 'Learn RxDB',
        done: false,
        meta: { s1: '1', s2: '2' },
        timestamp: new Date().toISOString()
    });

    console.log('Create myDocument')
    // console.log(myDocument)

    // const updatedDocument = await myDocument.patch({
    //     done: true
    // });

    // console.log('Create updatedDocument')
    // console.log(updatedDocument)

    // const modifyDocument = await myDocument.modify(docData => {
    //     docData.done = true;
    //     return docData;
    // });

    // console.log('Create modifyDocument')
    // console.log(modifyDocument)

    const foundDocuments = await myDatabase.todos.find({
        selector: {
            done: {
                $eq: false
            }
        }
    }).exec();

    console.log('Create foundDocuments')
    foundDocuments.forEach(doc => console.log(doc._data))
}

async function exportDB() {
    const jsonData = await myDatabase.exportJSON()
    const jsonString = JSON.stringify(jsonData, null, 2);

    // Write JSON string to the file
    fs.writeFileSync(filePath, jsonString, 'utf8', (err) => {
        if (err) {
            console.error("An error occurred while writing JSON to the file:", err);
        } else {
            console.log("JSON data successfully written to", filePath);
        }
    });
}

async function importDB() {
    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    console.log(fileContent)
    myDatabase.importJSON(fileContent)
        .then(() => console.log('done'));
}

async function _initDB() {

    myDatabase = await createRxDatabase({
        name: 'mydatabase',
        storage: wrappedKeyEncryptionCryptoJsStorage({
            storage: getRxStorageMemory()
        }),
        password: 'sudoLetMeIn',
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


async function test() {
    await _initDB()
    await importDB()
    await exportDB()
    await start()
}

test()

function encryptJson(data, key, iv) {
    const jsonString = JSON.stringify(data);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decryptJson(encryptedData, key, iv) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}