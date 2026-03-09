# Phase 3 Testing Checklist - Real-time Messaging

## Pre-Testing Setup

### 1. Ensure Backend Server is Running
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\backend"
pnpm run dev
```
**Expected:** Server running on `http://localhost:3000` with Socket.io enabled

### 2. Start Mobile App
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\mobile"
pnpm start
```
Then press `w` for web

**Note:** For real-time testing, you may want to open the app in two different browsers/incognito windows to simulate two users.

---

## Test Accounts

**Client Account:**
- Email: `test@alyne.com` (or use dev login)
- Password: `test123`
- User Type: `CLIENT`

**Provider Account:**
- Email: `newprovider@alyne.com` (or any provider from Phase 2)
- Password: `provider123`
- User Type: `PROVIDER`

---

## Test 3.1: Conversation List

### Steps:
1. Login as a client (or use dev login)
2. Navigate to **Messages** tab
3. Verify conversations list loads
4. Check if conversations display correctly
5. Test pull-to-refresh

### Expected Results:
- ✅ Messages tab loads without errors
- ✅ Empty state shows if no conversations exist
- ✅ Conversations display with:
  - Other user's name and photo
  - Last message preview
  - Timestamp
  - Unread count badge (if any)
- ✅ Pull-to-refresh works
- ✅ Can tap on a conversation to open chat

### Common Issues:
- No conversations → Need to send messages first (see Test 3.2)
- Socket connection error → Check backend Socket.io setup, authentication
- Conversations not loading → Check API endpoint `/messages/conversations`

---

## Test 3.2: Chat Screen - Message History

### Steps:
1. From Messages tab, tap on a conversation (or create one by sending a message)
2. Verify chat screen opens
3. Check message history loads
4. Verify messages display correctly:
   - Sent messages (right-aligned, your messages)
   - Received messages (left-aligned, other user's messages)
   - Timestamps
   - Message status indicators

### Expected Results:
- ✅ Chat screen opens without errors
- ✅ Message history loads from database
- ✅ Messages display in chronological order (oldest to newest)
- ✅ Sent messages appear on the right
- ✅ Received messages appear on the left
- ✅ Timestamps are visible
- ✅ Can scroll through message history
- ✅ Empty state shows if no messages exist

### Common Issues:
- Blank chat screen → Check API endpoint `/messages/:userId`
- Messages not loading → Check database, message service
- Wrong message alignment → Check sender/receiver logic

---

## Test 3.3: Sending Messages

### Steps:
1. Open a chat screen
2. Type a message in the input field
3. Tap send button (or press Enter)
4. Verify message appears immediately
5. Check message status

### Expected Results:
- ✅ Input field accepts text
- ✅ Send button is enabled when text is entered
- ✅ Message appears immediately (optimistic UI)
- ✅ Message is sent via Socket.io
- ✅ Message is saved to database
- ✅ Message status updates (SENT → DELIVERED → READ)
- ✅ Input field clears after sending
- ✅ Can send multiple messages in sequence

### Common Issues:
- Message not sending → Check Socket.io connection, authentication
- Message not appearing → Check optimistic UI update
- Socket error → Check backend Socket.io event handlers
- Message not saving → Check message service, database

---

## Test 3.4: Real-time Message Delivery

### Steps:
1. Open chat on **Device/Browser A** (logged in as User 1)
2. Open chat on **Device/Browser B** (logged in as User 2) - same conversation
3. Send a message from Device A
4. Verify message appears on Device B without refresh
5. Send a message from Device B
6. Verify message appears on Device A without refresh

### Expected Results:
- ✅ Socket connection established on both devices
- ✅ Message sent from Device A appears on Device B in real-time
- ✅ Message sent from Device B appears on Device A in real-time
- ✅ No page refresh needed
- ✅ Messages appear in correct order
- ✅ Conversation list updates on both devices

### Common Issues:
- Messages not appearing in real-time → Check Socket.io room joining
- Connection drops → Check authentication, network
- Messages delayed → Check Socket.io event emission
- Wrong user receives message → Check room ID logic

---

## Test 3.5: Message Status Updates

### Steps:
1. Send a message from User A to User B
2. Verify message status is "SENT"
3. Open chat on User B's device
4. Verify message status updates to "DELIVERED"
5. User B reads the message
6. Verify message status updates to "READ" on User A's device

### Expected Results:
- ✅ Message status shows "SENT" immediately after sending
- ✅ Status updates to "DELIVERED" when message is received
- ✅ Status updates to "READ" when message is read
- ✅ Status updates appear in real-time
- ✅ Status indicators are visible in chat

### Common Issues:
- Status not updating → Check markAsRead API, Socket.io events
- Status stuck on SENT → Check delivery/read logic
- Status not syncing → Check Socket.io event emission

---

## Test 3.6: Unread Count Badges

### Steps:
1. User A sends a message to User B
2. Verify unread count badge appears on User B's conversation list
3. User B opens the conversation
4. Verify unread count badge disappears
5. User A sends another message
6. Verify unread count badge appears again

### Expected Results:
- ✅ Unread count badge appears when new message received
- ✅ Badge shows correct count
- ✅ Badge disappears when conversation is opened
- ✅ Badge updates in real-time
- ✅ Badge persists across app refreshes

### Common Issues:
- Badge not appearing → Check unread count calculation
- Badge not updating → Check markAsRead API
- Badge not clearing → Check read status update

---

## Test 3.7: Conversation List Updates

### Steps:
1. User A and User B have an existing conversation
2. User A sends a new message
3. Verify conversation list updates on User B's device:
   - Last message preview updates
   - Conversation moves to top of list
   - Timestamp updates
4. User B sends a reply
5. Verify conversation list updates on User A's device

### Expected Results:
- ✅ Last message preview updates with new message
- ✅ Conversation moves to top of list (most recent first)
- ✅ Timestamp updates correctly
- ✅ Updates happen in real-time
- ✅ Unread count updates

### Common Issues:
- List not updating → Check Socket.io new-message event
- Wrong order → Check sorting logic
- Preview not updating → Check lastMessage field

---

## Test 3.8: Multiple Conversations

### Steps:
1. User A has conversations with User B and User C
2. Verify both conversations appear in list
3. Send message to User B
4. Verify User B conversation moves to top
5. Send message to User C
6. Verify User C conversation moves to top
7. Verify both conversations remain in list

### Expected Results:
- ✅ Multiple conversations display correctly
- ✅ Conversations sorted by most recent message
- ✅ Each conversation shows correct last message
- ✅ Unread counts are correct for each conversation
- ✅ Can navigate between conversations

### Common Issues:
- Duplicate conversations → Check conversation grouping logic
- Wrong sorting → Check timestamp sorting
- Missing conversations → Check conversation query logic

---

## Test 3.9: Error Handling

### Steps:
1. Disconnect from internet
2. Try to send a message
3. Verify error handling
4. Reconnect to internet
5. Verify message sends successfully

### Expected Results:
- ✅ Error message shown when sending fails
- ✅ Message is queued or retried
- ✅ Connection status is indicated
- ✅ Messages send successfully after reconnection
- ✅ No duplicate messages

### Common Issues:
- No error feedback → Add error handling UI
- Messages lost → Implement message queuing
- Duplicate messages → Check message deduplication

---

## Test 3.10: Socket Connection Management

### Steps:
1. Login to app
2. Verify Socket.io connection is established
3. Check browser console for connection logs
4. Navigate away from app
5. Return to app
6. Verify connection re-establishes

### Expected Results:
- ✅ Socket connects on login
- ✅ Connection status is maintained
- ✅ Reconnects automatically if connection drops
- ✅ Messages queue during disconnection
- ✅ Messages sync after reconnection

### Common Issues:
- Connection not establishing → Check authentication, Socket.io setup
- Not reconnecting → Check reconnection logic
- Messages lost → Check message persistence

---

## Success Criteria

Phase 3 is complete when:
- ✅ Conversation list loads and displays correctly
- ✅ Chat screen opens and shows message history
- ✅ Messages can be sent and received
- ✅ Real-time delivery works between two users
- ✅ Message status updates correctly
- ✅ Unread count badges work
- ✅ Conversation list updates in real-time
- ✅ Multiple conversations work correctly
- ✅ Error handling is functional
- ✅ Socket connection is stable

---

## Notes

- For best testing, use two different browsers or incognito windows
- Check browser console for Socket.io connection logs
- Verify backend logs show Socket.io events
- Test with both client-to-provider and provider-to-client messaging
- Ensure messages persist after app refresh

