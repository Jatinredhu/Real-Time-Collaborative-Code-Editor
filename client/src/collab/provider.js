import { io } from 'socket.io-client';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';

export class SocketProvider {
    constructor(docId, token, { onStatus, onSynced, onError, onLanguage } = {}) {
        this.docId = docId;
        this.onStatus = onStatus ?? (() => { });
        this.onSynced = onSynced ?? (() => { });
        this.onError = onError ?? (() => { });
        this.onLanguage = onLanguage ?? (() => { });
        this.synced = false;
        this.destroyed = false;

        this.ydoc = new Y.Doc();
        this.awareness = new awarenessProtocol.Awareness(this.ydoc);
        this.socket = io(import.meta.env.VITE_API_URL, { auth: { token } });

        this.ydoc.on('update', this.handleDocUpdate);
        this.awareness.on('update', this.handleAwarenessUpdate);

        this.socket.on('connect', this.join);
        this.socket.on('disconnect', this.handleDisconnect);
        this.socket.on('connect_error', (err) => {
            this.onStatus('offline');
            this.onError(err.message);
        });
        this.socket.on('doc-update', (docId, update) => {
            if (docId !== this.docId) return;
            Y.applyUpdate(this.ydoc, new Uint8Array(update), this);
        });
        this.socket.on('awareness-update', (docId, update) => {
            if (docId !== this.docId) return;
            awarenessProtocol.applyAwarenessUpdate(this.awareness, new Uint8Array(update), this);
        });
        this.socket.on('language-change', (docId, language) => {
            if (docId !== this.docId) return;
            this.onLanguage(language);
        });

        this.onStatus('connecting');
    }

    join = () => {
        this.onStatus('connecting');
        this.socket.emit('join-doc', this.docId, (reply) => {
            if (this.destroyed) return;
            if (!reply.ok) {
                this.onError(reply.message);
                return;
            }

            Y.applyUpdate(this.ydoc, new Uint8Array(reply.update), this);
            awarenessProtocol.applyAwarenessUpdate(this.awareness, new Uint8Array(reply.awareness), this);
            this.synced = true;

            this.socket.emit('doc-update', this.docId, Y.encodeStateAsUpdate(this.ydoc));
            this.awareness.setLocalState(this.awareness.getLocalState());

            this.onStatus('synced');
            this.onSynced({ role: reply.role, language: reply.language });
        });
    };

    handleDocUpdate = (update, origin) => {
        if (origin === this || !this.synced) return;
        this.socket.emit('doc-update', this.docId, update);
    };

    handleAwarenessUpdate = ({ added, updated, removed }, origin) => {
        if (origin === this || !this.synced) return;
        const changed = added.concat(updated, removed);
        const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed);
        this.socket.emit('awareness-update', this.docId, update);
    };

    handleDisconnect = () => {
        if (this.destroyed) return;
        this.synced = false;
        this.onStatus('offline');
    };

    destroy() {
        this.destroyed = true;
        this.synced = false;
        this.socket.emit('leave-doc', this.docId);
        this.socket.disconnect();
        this.awareness.destroy();
        this.ydoc.destroy();
    }
    setLanguage(language) {
        this.socket.emit('language-change', this.docId, language);
    }
}