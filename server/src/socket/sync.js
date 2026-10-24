import * as Y from 'yjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Doc from '../models/Doc.js';
import * as awarenessProtocol from 'y-protocols/awareness';

const rooms = new Map();
let ioServer = null;

function getRoom(docId) {
  if (!rooms.has(docId)) {
    const promise = (async () => {
      const doc = await Doc.findById(docId);
      if (!doc) return null;
      const ydoc = new Y.Doc();
      if (doc.state) Y.applyUpdate(ydoc, new Uint8Array(doc.state));
      const room = { ydoc, saveTimer: null, maxTimer: null };
      ydoc.on('update', () => scheduleSave(docId, room));
      return room;
    })();
    rooms.set(docId, promise);
    promise.then((room) => {
      if (!room) rooms.delete(docId);
    }).catch(() => rooms.delete(docId));
  }
  return rooms.get(docId);
}

const SAVE_DELAY = 2000;
const SAVE_MAX_WAIT = 10000;

async function saveRoom(docId, room) {
  clearTimeout(room.saveTimer);
  clearTimeout(room.maxTimer);
  room.saveTimer = null;
  room.maxTimer = null;
  try {
    const state = Buffer.from(Y.encodeStateAsUpdate(room.ydoc));
    await Doc.updateOne({ _id: docId }, { $set: { state } });
  } catch (err) {
    console.error('save failed for', docId, err.message);
  }
}

function scheduleSave(docId, room) {
  clearTimeout(room.saveTimer);
  room.saveTimer = setTimeout(() => saveRoom(docId, room), SAVE_DELAY);
  if (!room.maxTimer) {
    room.maxTimer = setTimeout(() => saveRoom(docId, room), SAVE_MAX_WAIT);
  }
}

async function closeRoomIfEmpty(io, docId) {
  const members = io.sockets.adapter.rooms.get(docId);
  if (members && members.size > 0) return;

  const room = await rooms.get(docId);
  if (!room) return;

  await saveRoom(docId, room);

  const after = io.sockets.adapter.rooms.get(docId);
  if (!after || after.size === 0) {
    room.ydoc.destroy();
    rooms.delete(docId);
  }
}

export async function flushAll() {
  for (const [docId, promise] of rooms) {
    const room = await promise;
    if (room) await saveRoom(docId, room);
  }
}

export function registerSync(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select('name email');
      if (!user) return next(new Error('User not found'));
      socket.data.user = user;
      socket.data.docs = new Map();
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-doc', async (docId, ack) => {
      if (typeof ack !== 'function') return;
      try {
        if (!mongoose.isValidObjectId(docId)) {
          return ack({ ok: false, message: 'Document not found' });
        }
        const meta = await Doc.findById(docId).select('-state');
        if (!meta) return ack({ ok: false, message: 'Document not found' });

        const role = meta.getRole(socket.data.user._id);
        if (!role) return ack({ ok: false, message: 'No access' });

        socket.join(docId);
        const room = await getRoom(docId);
        if (!room) {
          socket.leave(docId);
          return ack({ ok: false, message: 'Document not found' });
        }
        socket.data.docs.set(docId, role);
        ack({
          ok: true,
          role,
          language: meta.language,
          update: Y.encodeStateAsUpdate(room.ydoc),
        });
      } catch (err) {
        socket.leave(docId);
        console.error(err);
        ack({ ok: false, message: 'Server error' });
      }
    });

    socket.on('doc-update', async (docId, update) => {
      try {
        const role = socket.data.docs.get(docId);
        if (!role || role === 'viewer') return;
        if (!(update instanceof Uint8Array)) return;

        const room = await getRoom(docId);
        if (!room) return;

        Y.applyUpdate(room.ydoc, update, socket.id);
        socket.to(docId).emit('doc-update', docId, update);
      } catch (err) {
        console.error('bad update:', err.message);
      }
    });

    socket.on('leave-doc', (docId) => {
      socket.leave(docId);
      socket.data.docs.delete(docId);
      closeRoomIfEmpty(io, docId);
    });

    socket.on('disconnect', () => {
      for (const docId of socket.data.docs.keys()) {
        closeRoomIfEmpty(io, docId);
      }
    });
  });
}