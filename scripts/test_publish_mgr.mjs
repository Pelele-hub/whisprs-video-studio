import { checkBufferLimits, getNextSlot } from './publish_queue_manager.mjs';

async function test() {
  console.log('Testing Buffer limits check...');
  const limits = await checkBufferLimits();
  console.log('Limits result:', JSON.stringify(limits, null, 2));

  const slot = getNextSlot([]);
  console.log('Next slot (UTC):', slot.toISOString());
  console.log('Next slot (Casablanca):', slot.toLocaleString('en-GB', { timeZone: 'Africa/Casablanca' }));
}

test().catch(console.error);
