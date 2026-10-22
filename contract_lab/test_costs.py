import unittest
from decimal import Decimal

from contract_lab.costs import VoiceUsage


class UsageAccounting(unittest.TestCase):
    def test_cumulative_and_duplicate_events_not_added(self):
        usage = VoiceUsage()
        for n in (10, 20, 20, 15, 30):
            usage.observe('one', n)
        self.assertEqual(Decimal(usage.estimate()['voice_usd']), Decimal('0.025'))

    def test_final_and_reconnection_are_separate(self):
        usage = VoiceUsage(); usage.observe('one', 60, final=True)
        usage.observe('one', 90); usage.observe('two', 60, final=True)
        self.assertEqual(Decimal(usage.estimate()['voice_usd']), Decimal('0.1'))
        self.assertTrue(usage.estimate()['finalization_confirmed'])

    def test_disconnection_does_not_claim_final_cost(self):
        usage = VoiceUsage(); usage.observe('one', 30)
        self.assertFalse(usage.estimate()['finalization_confirmed'])
        self.assertGreater(Decimal(usage.estimate()['total_usd']), 0)

    def test_published_illustrative_cost_is_reproducible(self):
        usage = VoiceUsage(); usage.observe('one', 1800, final=True)
        result = usage.estimate(model_input=40000, model_output=8000, decision_input=80000)
        self.assertEqual(Decimal(result['total_usd']), Decimal('1.668'))

    def test_invalid_or_conflicting_usage_requires_reconciliation(self):
        usage = VoiceUsage(); usage.observe('one', 20)
        for n in (-1, 'NaN', 'Infinity'):
            with self.assertRaises(ValueError): usage.observe('two', n)
        with self.assertRaises(ValueError): usage.observe('one', 10, final=True)
        with self.assertRaises(ValueError): usage.estimate(model_input=-1)


if __name__ == '__main__':
    unittest.main()
