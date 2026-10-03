"""Invariant tests for the planning model; no external services."""
import unittest
from calculate import load, calculate, clip_example
class ModelTests(unittest.TestCase):
    def setUp(self): self.d=load()
    def test_zero_users(self):
        r=calculate(self.d); z=r['counts'][0]
        self.assertEqual(z['revenue'],0); self.assertEqual(z['profit'],-r['fixed']); self.assertIsNone(z['margin'])
    def test_annual_is_recognized_monthly(self):
        r=calculate(self.d,{'weekly_share':0,'monthly_share':0,'starter_share':1})
        self.assertAlmostEqual(r['mix']['gross'],190/12)
    def test_consumption_increases_cost(self):
        self.assertGreater(calculate(self.d,{'utilization':1})['mix']['variable'],calculate(self.d)['mix']['variable'])
    def test_tax_reduces_revenue(self):
        self.assertLess(calculate(self.d,{'consumer_vat_rate':.27})['mix']['revenue'],calculate(self.d,{'consumer_vat_rate':0})['mix']['revenue'])
    def test_target_is_actual_minimum(self):
        for s in self.d['scenarios']:
            r=calculate(self.d,s['overrides']);n=r['users_for_target']
            if n:
                margin=lambda k:(k*r['mix']['contribution']-r['fixed'])/(k*r['mix']['revenue'])
                self.assertGreaterEqual(margin(n)+1e-10,r['inputs']['target_margin'])
                if n>1: self.assertLess(margin(n-1),r['inputs']['target_margin'])
    def test_uncontrolled_compute_cannot_be_fixed_by_volume(self):
        self.assertIsNone(calculate(self.d,{'credit_cost_eur':.03,'utilization':1})['users_for_target'])
    def test_invalid_mix(self):
        with self.assertRaises(ValueError): calculate(self.d,{'weekly_share':.8,'monthly_share':.8})
    def test_managed_fee_uses_gross_not_net_tax_revenue(self):
        before=calculate(self.d,{'managed_payments_rate':0})
        after=calculate(self.d,{'managed_payments_rate':.035})
        self.assertAlmostEqual(after['mix']['variable']-before['mix']['variable'],before['mix']['gross']*.035)
        self.assertEqual(after['mix']['revenue'],before['mix']['revenue'])
    def test_screening_counts_attempts_without_changing_compute(self):
        before=calculate(self.d,{'radar_screen_ron':0})
        after=calculate(self.d,{'radar_screen_ron':.31,'screened_per_payment':1.2})
        expected=before['mix']['payments']*.31*1.2/before['inputs']['eur_ron']
        self.assertAlmostEqual(after['mix']['variable']-before['mix']['variable'],expected)
        self.assertEqual(after['mix']['compute'],before['mix']['compute'])
    def test_example_has_positive_rounded_quote(self):
        ex=clip_example(self.d); self.assertGreater(ex['quote_credits'],0)
        self.assertGreaterEqual(ex['quote_credits']*.01,ex['buffered_eur'])
if __name__=='__main__': unittest.main()
