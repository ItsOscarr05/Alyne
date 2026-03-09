# Quick Test Reference Guide

**For:** Rapid testing and smoke testing  
**Use:** Before commits, after deployments, quick validation

---

## 5-Minute Smoke Test

### Critical Paths Only

1. **Login** → Use test account
2. **Discover** → Verify providers show
3. **View Provider** → Click provider card, verify modal opens
4. **Create Booking** → Book a session
5. **Accept Booking** → Login as provider, accept booking
6. **Payment** → Complete payment flow
7. **Message** → Send a message
8. **Review** → Submit a review

**Expected:** All steps complete without errors

---

## 15-Minute Regression Test

### Core Features

**Authentication:**

- [ ] Login works
- [ ] Registration works
- [ ] Logout works

**Discovery:**

- [ ] Providers display
- [ ] Search works
- [ ] Provider detail modal opens

**Bookings:**

- [ ] Create booking
- [ ] Accept booking
- [ ] Complete booking
- [ ] Real-time updates work

**Payments:**

- [ ] Payment modal opens
- [ ] Stripe payment works
- [ ] Plaid payment works
- [ ] Receipt displays

**Messaging:**

- [ ] Conversations list loads
- [ ] Send message works
- [ ] Receive message works

**Reviews:**

- [ ] Submit review works
- [ ] Review displays on profile

---

## Test Data Quick Reference

### Test Accounts

```
Client: test@alyne.com / test123
Provider: yoga@alyne.com / provider123
```

### Test Cards (Stripe)

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
```

### Test Bank (Plaid Sandbox)

```
Bank: Any bank
Username: user_good
Password: pass_good
```

---

## Common Issues & Quick Fixes

### Issue: No providers showing

**Check:**

- Backend server running?
- Database seeded?
- API endpoint responding?

### Issue: Payment not working

**Check:**

- Stripe keys in .env?
- Plaid keys in .env?
- Test mode enabled?

### Issue: Real-time not working

**Check:**

- Socket.io connected? (check console)
- Redis running? (optional)
- Network connection?

### Issue: Modals not opening

**Check:**

- Modal component imported?
- State management correct?
- No JavaScript errors?

---

## Pre-Release Checklist

Before any release, verify:

- [ ] All smoke tests pass
- [ ] No console errors
- [ ] No critical bugs
- [ ] Payment flow works
- [ ] Real-time updates work
- [ ] Cross-browser tested (Chrome, Firefox, Safari)
- [ ] Mobile tested (iOS/Android if applicable)

---

**Last Updated:** December 2024
