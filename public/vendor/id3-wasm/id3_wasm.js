let wasm;

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

let WASM_VECTOR_LEN = 0;

const AlbumCoverMetadatumFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_albumcovermetadatum_free(ptr >>> 0, 1));

const CommentMetadatumFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_commentmetadatum_free(ptr >>> 0, 1));

const ExtendedTextMetadatumFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_extendedtextmetadatum_free(ptr >>> 0, 1));

const MetadataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_metadata_free(ptr >>> 0, 1));

const TagControllerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_tagcontroller_free(ptr >>> 0, 1));

class AlbumCoverMetadatum {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AlbumCoverMetadatum.prototype);
        obj.__wbg_ptr = ptr;
        AlbumCoverMetadatumFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AlbumCoverMetadatumFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_albumcovermetadatum_free(ptr, 0);
    }
    /**
     * @returns {Uint8Array}
     */
    get data() {
        const ret = wasm.albumcovermetadatum_data(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get mimeType() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.albumcovermetadatum_mimeType(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) AlbumCoverMetadatum.prototype[Symbol.dispose] = AlbumCoverMetadatum.prototype.free;

class CommentMetadatum {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CommentMetadatum.prototype);
        obj.__wbg_ptr = ptr;
        CommentMetadatumFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CommentMetadatumFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_commentmetadatum_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get description() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.commentmetadatum_description(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get lang() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.commentmetadatum_lang(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get text() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.commentmetadatum_text(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) CommentMetadatum.prototype[Symbol.dispose] = CommentMetadatum.prototype.free;

class ExtendedTextMetadatum {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ExtendedTextMetadatumFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_extendedtextmetadatum_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get description() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.extendedtextmetadatum_description(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get value() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.extendedtextmetadatum_value(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) ExtendedTextMetadatum.prototype[Symbol.dispose] = ExtendedTextMetadatum.prototype.free;

class Metadata {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Metadata.prototype);
        obj.__wbg_ptr = ptr;
        MetadataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MetadataFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_metadata_free(ptr, 0);
    }
    /**
     * @returns {number | undefined}
     */
    get trackIndex() {
        const ret = wasm.__wbg_get_metadata_trackIndex(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {number | null} [arg0]
     */
    set trackIndex(arg0) {
        wasm.__wbg_set_metadata_trackIndex(this.__wbg_ptr, isLikeNone(arg0) ? 0x100000001 : (arg0) >>> 0);
    }
    /**
     * @returns {number | undefined}
     */
    get trackCount() {
        const ret = wasm.__wbg_get_metadata_trackCount(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {number | null} [arg0]
     */
    set trackCount(arg0) {
        wasm.__wbg_set_metadata_trackCount(this.__wbg_ptr, isLikeNone(arg0) ? 0x100000001 : (arg0) >>> 0);
    }
    /**
     * @returns {number | undefined}
     */
    get discIndex() {
        const ret = wasm.__wbg_get_metadata_discIndex(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {number | null} [arg0]
     */
    set discIndex(arg0) {
        wasm.__wbg_set_metadata_discIndex(this.__wbg_ptr, isLikeNone(arg0) ? 0x100000001 : (arg0) >>> 0);
    }
    /**
     * @returns {number | undefined}
     */
    get discCount() {
        const ret = wasm.__wbg_get_metadata_discCount(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {number | null} [arg0]
     */
    set discCount(arg0) {
        wasm.__wbg_set_metadata_discCount(this.__wbg_ptr, isLikeNone(arg0) ? 0x100000001 : (arg0) >>> 0);
    }
    /**
     * @returns {number | undefined}
     */
    get year() {
        const ret = wasm.__wbg_get_metadata_year(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {number | null} [arg0]
     */
    set year(arg0) {
        wasm.__wbg_set_metadata_year(this.__wbg_ptr, isLikeNone(arg0) ? 0x100000001 : (arg0) >> 0);
    }
    /**
     * @returns {number | undefined}
     */
    get duration() {
        const ret = wasm.__wbg_get_metadata_duration(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {number | null} [arg0]
     */
    set duration(arg0) {
        wasm.__wbg_set_metadata_duration(this.__wbg_ptr, isLikeNone(arg0) ? 0x100000001 : (arg0) >>> 0);
    }
    /**
     * @returns {AlbumCoverMetadatum | undefined}
     */
    get albumCover() {
        const ret = wasm.metadata_albumCover(this.__wbg_ptr);
        return ret === 0 ? undefined : AlbumCoverMetadatum.__wrap(ret);
    }
    /**
     * @returns {string | undefined}
     */
    get albumArtist() {
        const ret = wasm.metadata_albumArtist(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @returns {string | undefined}
     */
    get dateRecorded() {
        const ret = wasm.metadata_dateRecorded(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @returns {string | undefined}
     */
    get dateReleased() {
        const ret = wasm.metadata_dateReleased(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @returns {string | undefined}
     */
    get album() {
        const ret = wasm.metadata_album(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @returns {string | undefined}
     */
    get genre() {
        const ret = wasm.metadata_genre(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @returns {string | undefined}
     */
    get title() {
        const ret = wasm.metadata_title(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @returns {string | undefined}
     */
    get artist() {
        const ret = wasm.metadata_artist(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @returns {Array<any>}
     */
    get lyrics() {
        const ret = wasm.metadata_lyrics(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Array<any>}
     */
    get comments() {
        const ret = wasm.metadata_comments(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string | undefined}
     */
    get publisher() {
        const ret = wasm.metadata_publisher(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
}
if (Symbol.dispose) Metadata.prototype[Symbol.dispose] = Metadata.prototype.free;

class TagController {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TagController.prototype);
        obj.__wbg_ptr = ptr;
        TagControllerFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TagControllerFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_tagcontroller_free(ptr, 0);
    }
    /**
     * @param {CommentMetadatum} lyrics
     */
    addLyrics(lyrics) {
        _assertClass(lyrics, CommentMetadatum);
        var ptr0 = lyrics.__destroy_into_raw();
        wasm.tagcontroller_addLyrics(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {string} artist
     */
    setArtist(artist) {
        const ptr0 = passStringToWasm0(artist, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.tagcontroller_setArtist(this.__wbg_ptr, ptr0, len0);
    }
    removeYear() {
        wasm.tagcontroller_removeYear(this.__wbg_ptr);
    }
    /**
     * @param {Uint8Array} head
     * @param {Uint8Array | null} [tail]
     * @returns {TagController}
     */
    static fromPartial(head, tail) {
        const ptr0 = passArray8ToWasm0(head, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(tail) ? 0 : passArray8ToWasm0(tail, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.tagcontroller_fromPartial(ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TagController.__wrap(ret[0]);
    }
    /**
     * @returns {Metadata}
     */
    getMetadata() {
        const ret = wasm.tagcontroller_getMetadata(this.__wbg_ptr);
        return Metadata.__wrap(ret);
    }
    /**
     * Puts the tag into the buffer and returns the new buffer.
     * Not-in-place method.
     * @param {Uint8Array} buffer
     * @returns {Uint8Array}
     */
    putTagInto(buffer) {
        const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.tagcontroller_putTagInto(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    removeAlbum() {
        wasm.tagcontroller_removeAlbum(this.__wbg_ptr);
    }
    removeGenre() {
        wasm.tagcontroller_removeGenre(this.__wbg_ptr);
    }
    removeTitle() {
        wasm.tagcontroller_removeTitle(this.__wbg_ptr);
    }
    /**
     * @param {number} duration_in_seconds
     */
    setDuration(duration_in_seconds) {
        wasm.tagcontroller_setDuration(this.__wbg_ptr, duration_in_seconds);
    }
    removeArtist() {
        wasm.tagcontroller_removeArtist(this.__wbg_ptr);
    }
    /**
     * @param {string} publisher
     */
    setPublisher(publisher) {
        const ptr0 = passStringToWasm0(publisher, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.tagcontroller_setPublisher(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} disc_count
     */
    setDiscCount(disc_count) {
        wasm.tagcontroller_setDiscCount(this.__wbg_ptr, disc_count);
    }
    /**
     * @param {number} disc_index
     */
    setDiscIndex(disc_index) {
        wasm.tagcontroller_setDiscIndex(this.__wbg_ptr, disc_index);
    }
    /**
     * @param {number} track_count
     */
    setTrackCount(track_count) {
        wasm.tagcontroller_setTrackCount(this.__wbg_ptr, track_count);
    }
    /**
     * @param {number} track_index
     */
    setTrackIndex(track_index) {
        wasm.tagcontroller_setTrackIndex(this.__wbg_ptr, track_index);
    }
    /**
     * @param {string} album_artist
     */
    setAlbumArtist(album_artist) {
        const ptr0 = passStringToWasm0(album_artist, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.tagcontroller_setAlbumArtist(this.__wbg_ptr, ptr0, len0);
    }
    removeDiscCount() {
        wasm.tagcontroller_removeDiscCount(this.__wbg_ptr);
    }
    removeDiscIndex() {
        wasm.tagcontroller_removeDiscIndex(this.__wbg_ptr);
    }
    /**
     * yyyy-MM-ddTHH:mm:ss
     * @param {string} timestamp
     */
    setDateRecorded(timestamp) {
        const ptr0 = passStringToWasm0(timestamp, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.tagcontroller_setDateRecorded(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} timestamp
     */
    setDateReleased(timestamp) {
        const ptr0 = passStringToWasm0(timestamp, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.tagcontroller_setDateReleased(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    removeTrackCount() {
        wasm.tagcontroller_removeTrackCount(this.__wbg_ptr);
    }
    removeTrackIndex() {
        wasm.tagcontroller_removeTrackIndex(this.__wbg_ptr);
    }
    removeAlbumArtist() {
        wasm.tagcontroller_removeAlbumArtist(this.__wbg_ptr);
    }
    /**
     * @returns {TagController}
     */
    static new() {
        const ret = wasm.tagcontroller_new();
        return TagController.__wrap(ret);
    }
    /**
     * @param {Uint8Array} buffer
     * @returns {TagController}
     */
    static from(buffer) {
        const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.tagcontroller_from(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TagController.__wrap(ret[0]);
    }
    /**
     * @param {number} year
     */
    setYear(year) {
        wasm.tagcontroller_setYear(this.__wbg_ptr, year);
    }
    /**
     * @param {string} album
     */
    setAlbum(album) {
        const ptr0 = passStringToWasm0(album, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.tagcontroller_setAlbum(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {string} genre
     */
    setGenre(genre) {
        const ptr0 = passStringToWasm0(genre, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.tagcontroller_setGenre(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {string} title
     */
    setTitle(title) {
        const ptr0 = passStringToWasm0(title, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.tagcontroller_setTitle(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) TagController.prototype[Symbol.dispose] = TagController.prototype.free;

/**
 * @param {Uint8Array} head
 * @returns {boolean}
 */
function hasId3v2Tag(head) {
    const ptr0 = passArray8ToWasm0(head, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.hasId3v2Tag(ptr0, len0);
    return ret !== 0;
}

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_commentmetadatum_new = function(arg0) {
        const ret = CommentMetadatum.__wrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_new_25f239778d6112b9 = function() {
        const ret = new Array();
        return ret;
    };
    imports.wbg.__wbg_new_df1173567d5ff028 = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_new_from_slice_f9c22b9153b26992 = function(arg0, arg1) {
        const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_push_7d9be8f38fc13975 = function(arg0, arg1) {
        const ret = arg0.push(arg1);
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('id3_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

{ initSync };
default __wbg_init;
