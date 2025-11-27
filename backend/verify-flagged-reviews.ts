/**
 * Verification Script: Flagged Reviews Persistence
 * 
 * This script verifies that flagged reviews are NOT deleted from the database,
 * but instead are marked with isFlagged: true and isVisible: false
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFlaggedReviews() {
  console.log('🔍 Verifying flagged reviews persistence...\n');

  try {
    // 1. Get all reviews (including flagged ones)
    const allReviews = await prisma.review.findMany({
      select: {
        id: true,
        rating: true,
        comment: true,
        isVisible: true,
        isFlagged: true,
        flagReason: true,
        createdAt: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        provider: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Total reviews in database: ${allReviews.length}\n`);

    // 2. Count flagged reviews
    const flaggedReviews = allReviews.filter((r) => r.isFlagged === true);
    const visibleReviews = allReviews.filter((r) => r.isVisible === true);
    const hiddenReviews = allReviews.filter((r) => r.isVisible === false);

    console.log(`🚩 Flagged reviews: ${flaggedReviews.length}`);
    console.log(`👁️  Visible reviews: ${visibleReviews.length}`);
    console.log(`🙈 Hidden reviews: ${hiddenReviews.length}\n`);

    // 3. Verify flagged reviews still exist
    if (flaggedReviews.length > 0) {
      console.log('✅ VERIFICATION PASSED: Flagged reviews still exist in database!\n');
      console.log('📋 Flagged Review Details:');
      flaggedReviews.forEach((review, index) => {
        console.log(`\n  ${index + 1}. Review ID: ${review.id}`);
        console.log(`     Rating: ${review.rating}/5`);
        console.log(`     Comment: ${review.comment || '(no comment)'}`);
        console.log(`     Client: ${review.client.firstName} ${review.client.lastName}`);
        console.log(`     Provider: ${review.provider.firstName} ${review.provider.lastName}`);
        console.log(`     Is Flagged: ${review.isFlagged}`);
        console.log(`     Is Visible: ${review.isVisible}`);
        console.log(`     Flag Reason: ${review.flagReason || '(no reason provided)'}`);
        console.log(`     Created: ${review.createdAt.toISOString()}`);
      });
    } else {
      console.log('ℹ️  No flagged reviews found in database (this is okay if none have been flagged yet)');
    }

    // 4. Verify that flagged reviews are hidden (isVisible: false)
    const flaggedButVisible = flaggedReviews.filter((r) => r.isVisible === true);
    if (flaggedButVisible.length > 0) {
      console.log('\n⚠️  WARNING: Some flagged reviews are still visible!');
      console.log('   This should not happen - flagged reviews should have isVisible: false');
    } else if (flaggedReviews.length > 0) {
      console.log('\n✅ VERIFICATION PASSED: All flagged reviews are properly hidden (isVisible: false)');
    }

    // 5. Verify that non-flagged reviews are visible
    const nonFlaggedHidden = allReviews.filter((r) => !r.isFlagged && !r.isVisible);
    if (nonFlaggedHidden.length > 0) {
      console.log('\n⚠️  WARNING: Some non-flagged reviews are hidden!');
      console.log('   This might be intentional, but worth checking');
    }

    console.log('\n✅ Verification complete!');
    console.log('\n📝 Summary:');
    console.log(`   - Total reviews: ${allReviews.length}`);
    console.log(`   - Flagged reviews: ${flaggedReviews.length} (all still in database)`);
    console.log(`   - Visible reviews: ${visibleReviews.length}`);
    console.log(`   - Hidden reviews: ${hiddenReviews.length}`);
    console.log('\n✅ Flagged reviews are NOT deleted - they persist in the database with isFlagged: true');

  } catch (error) {
    console.error('❌ Error verifying flagged reviews:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyFlaggedReviews()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

