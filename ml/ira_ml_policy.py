from __future__ import annotations

"""IRA policy engine and ML-ready matching scaffold.

This module implements the final loan, interest, penalty, revenue split,
and Shri Score rules provided in the specification.

It also includes feature builders and a baseline lender-matching scorer that
can feed a future machine-learning pipeline.

Assumptions made where the policy was not fully numeric:
- Base cumulative interest is capped at the 90-day value of 18%.
- Partial payments only reduce penalty-bearing principal from the next late day,
  matching the stated policy.
"""

from dataclasses import asdict, dataclass, field
from decimal import Decimal, ROUND_HALF_UP, getcontext
from math import exp
from typing import Iterable, Mapping, Sequence

getcontext().prec = 28

TWO_PLACES = Decimal("0.01")
ZERO = Decimal("0")

BASE_CUMULATIVE_RATE_POINTS: tuple[tuple[int, Decimal], ...] = (
    (1, Decimal("0.00")),
    (3, Decimal("3.00")),
    (5, Decimal("5.00")),
    (10, Decimal("7.00")),
    (14, Decimal("9.00")),
    (21, Decimal("11.00")),
    (30, Decimal("14.00")),
    (90, Decimal("18.00")),
)

TIER_MULTIPLIERS: Mapping[str, Decimal] = {
    "Newbie": Decimal("1.00"),
    "Bronze": Decimal("0.90"),
    "Silver": Decimal("0.80"),
    "Gold": Decimal("0.70"),
    "Platinum": Decimal("0.60"),
}

TIER_MAX_LOAN_LIMITS: Mapping[str, int] = {
    "Newbie": 5000,
    "Bronze": 6000,
    "Silver": 7000,
    "Gold": 8500,
    "Platinum": 10000,
}

MIN_LOAN_AMOUNT = 500
MIN_INTEREST_WITHIN_24H = Decimal("0.01")
REGULAR_INTEREST_LENDER_SHARE = Decimal("0.85")
REGULAR_INTEREST_PLATFORM_SHARE = Decimal("0.15")
PENALTY_LENDER_SHARE = Decimal("0.60")
PENALTY_PLATFORM_SHARE = Decimal("0.40")
PENALTY_START_RATE = Decimal("0.0005")
PENALTY_DAILY_STEP = Decimal("0.0002")
PENALTY_CAP = Decimal("0.50")
DEFAULT_AFTER_DAYS = 90


def dec(value: int | float | str | Decimal) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))



def money(value: int | float | str | Decimal) -> Decimal:
    return dec(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class TierRule:
    name: str
    min_score: int
    max_score: int
    multiplier: Decimal
    max_loan_amount: int


TIER_RULES: tuple[TierRule, ...] = (
    TierRule("Newbie", 0, 300, TIER_MULTIPLIERS["Newbie"], TIER_MAX_LOAN_LIMITS["Newbie"]),
    TierRule("Bronze", 301, 500, TIER_MULTIPLIERS["Bronze"], TIER_MAX_LOAN_LIMITS["Bronze"]),
    TierRule("Silver", 501, 700, TIER_MULTIPLIERS["Silver"], TIER_MAX_LOAN_LIMITS["Silver"]),
    TierRule("Gold", 701, 850, TIER_MULTIPLIERS["Gold"], TIER_MAX_LOAN_LIMITS["Gold"]),
    TierRule("Platinum", 851, 1000, TIER_MULTIPLIERS["Platinum"], TIER_MAX_LOAN_LIMITS["Platinum"]),
)


@dataclass(frozen=True)
class PartialPayment:
    late_day: int
    amount: Decimal

    def __post_init__(self) -> None:
        if self.late_day < 1:
            raise ValueError("late_day must be >= 1")
        if dec(self.amount) < ZERO:
            raise ValueError("amount must be >= 0")


@dataclass(frozen=True)
class LoanRequest:
    principal: Decimal
    planned_tenure_days: int
    actual_days_held: int
    shri_score: int
    partial_payments: tuple[PartialPayment, ...] = ()

    def __post_init__(self) -> None:
        if dec(self.principal) < MIN_LOAN_AMOUNT:
            raise ValueError(f"principal must be at least {MIN_LOAN_AMOUNT}")
        if self.planned_tenure_days < 1 or self.planned_tenure_days > 90:
            raise ValueError("planned_tenure_days must be between 1 and 90")
        if self.actual_days_held < 1:
            raise ValueError("actual_days_held must be >= 1")
        if self.shri_score < 0 or self.shri_score > 1000:
            raise ValueError("shri_score must be between 0 and 1000")


@dataclass(frozen=True)
class RepaymentBreakdown:
    principal: Decimal
    planned_tenure_days: int
    actual_days_held: int
    overdue_days: int
    shri_score: int
    tier: str
    tier_multiplier: Decimal
    base_cumulative_rate_pct: Decimal
    effective_interest_rate_pct: Decimal
    regular_interest: Decimal
    penalty_amount: Decimal
    total_repayment: Decimal
    lender_regular_interest: Decimal
    platform_regular_interest: Decimal
    lender_penalty_share: Decimal
    platform_penalty_share: Decimal
    lender_total_earnings: Decimal
    platform_total_earnings: Decimal
    shri_score_change: int
    new_shri_score: int
    status_label: str
    default_triggered: bool

    def as_dict(self) -> dict[str, object]:
        data = asdict(self)
        for key, value in list(data.items()):
            if isinstance(value, Decimal):
                data[key] = float(value)
        return data


@dataclass(frozen=True)
class BorrowerProfile:
    borrower_id: str
    shri_score: int
    location: str
    college: str
    requested_amount: Decimal
    requested_tenure_days: int
    historical_loans: int
    on_time_repayments: int
    early_repayments: int
    late_repayments: int
    defaults: int
    guarantor_defaults: int = 0


@dataclass(frozen=True)
class LenderProfile:
    lender_id: str
    location: str
    college: str | None = None
    min_shri_score: int = 0
    max_ticket_size: Decimal = field(default_factory=lambda: Decimal("10000"))
    preferred_tenure_days: int = 30
    risk_tolerance: float = 0.50
    funded_loans: int = 0


@dataclass(frozen=True)
class LenderMatch:
    lender_id: str
    score: float
    probability: float
    features: dict[str, float]



def clamp_score(shri_score: int) -> int:
    return max(0, min(1000, shri_score))



def get_tier_rule(shri_score: int) -> TierRule:
    score = clamp_score(shri_score)
    for rule in TIER_RULES:
        if rule.min_score <= score <= rule.max_score:
            return rule
    return TIER_RULES[-1]



def get_max_loan_amount(shri_score: int) -> int:
    return get_tier_rule(shri_score).max_loan_amount



def interpolate_base_cumulative_rate(days: int) -> Decimal:
    if days <= BASE_CUMULATIVE_RATE_POINTS[0][0]:
        return BASE_CUMULATIVE_RATE_POINTS[0][1]
    if days >= BASE_CUMULATIVE_RATE_POINTS[-1][0]:
        return BASE_CUMULATIVE_RATE_POINTS[-1][1]

    for idx in range(1, len(BASE_CUMULATIVE_RATE_POINTS)):
        left_day, left_rate = BASE_CUMULATIVE_RATE_POINTS[idx - 1]
        right_day, right_rate = BASE_CUMULATIVE_RATE_POINTS[idx]
        if days <= right_day:
            span_days = Decimal(right_day - left_day)
            elapsed = Decimal(days - left_day)
            slope = (right_rate - left_rate) / span_days
            return left_rate + (slope * elapsed)

    return BASE_CUMULATIVE_RATE_POINTS[-1][1]



def daily_penalty_rate(late_day: int) -> Decimal:
    if late_day < 1:
        raise ValueError("late_day must be >= 1")
    return PENALTY_START_RATE + (dec(late_day - 1) * PENALTY_DAILY_STEP)



def calculate_penalty(
    principal: int | float | str | Decimal,
    overdue_days: int,
    partial_payments: Sequence[PartialPayment] = (),
) -> Decimal:
    if overdue_days <= 0:
        return ZERO

    original_principal = dec(principal)
    outstanding_principal = original_principal
    payments_by_day: dict[int, Decimal] = {}

    for payment in partial_payments:
        if payment.late_day > overdue_days:
            raise ValueError("partial payment late_day cannot exceed overdue_days")
        payments_by_day[payment.late_day] = payments_by_day.get(payment.late_day, ZERO) + dec(payment.amount)

    running_penalty = ZERO
    for late_day in range(1, overdue_days + 1):
        if outstanding_principal <= ZERO:
            break

        running_penalty += outstanding_principal * daily_penalty_rate(late_day)

        day_payment = payments_by_day.get(late_day, ZERO)
        if day_payment:
            outstanding_principal = max(ZERO, outstanding_principal - day_payment)

    capped_penalty = min(running_penalty, original_principal * PENALTY_CAP)
    return money(capped_penalty)



def calculate_regular_interest(
    principal: int | float | str | Decimal,
    actual_days_held: int,
    shri_score: int,
) -> tuple[Decimal, Decimal, Decimal, str]:
    principal_dec = dec(principal)
    tier = get_tier_rule(shri_score)
    base_rate_pct = interpolate_base_cumulative_rate(actual_days_held)

    if actual_days_held <= 1:
        effective_rate_pct = MIN_INTEREST_WITHIN_24H * Decimal("100")
        regular_interest = principal_dec * MIN_INTEREST_WITHIN_24H
        reason = "within_24_hours"
    else:
        effective_rate_pct = base_rate_pct * tier.multiplier
        regular_interest = principal_dec * (effective_rate_pct / Decimal("100"))
        reason = "cumulative_simple_interest"

    return money(regular_interest), base_rate_pct.quantize(TWO_PLACES), effective_rate_pct.quantize(TWO_PLACES), reason



def get_shri_score_change(actual_days_held: int, planned_tenure_days: int, overdue_days: int) -> tuple[int, str, bool]:
    if actual_days_held <= 1:
        return 5, "repaid_within_24h", False
    if overdue_days == 0 and actual_days_held < planned_tenure_days:
        return 15, "early_repayment", False
    if overdue_days == 0:
        return 10, "on_time_repayment", False
    if overdue_days <= 7:
        return -5, "late_1_to_7_days", False
    if overdue_days <= 30:
        return -15, "late_8_to_30_days", False
    if overdue_days >= DEFAULT_AFTER_DAYS:
        return -100, "default_after_90_days", True
    return -15, "late_over_30_days", False



def apply_shri_score_change(current_score: int, change: int, default_triggered: bool = False) -> int:
    if default_triggered:
        return 0
    return clamp_score(current_score + change)



def validate_loan_request(loan: LoanRequest) -> None:
    tier = get_tier_rule(loan.shri_score)
    if loan.principal > dec(tier.max_loan_amount):
        raise ValueError(
            f"principal exceeds inferred max for {tier.name} tier: {tier.max_loan_amount}"
        )



def calculate_repayment(loan: LoanRequest) -> RepaymentBreakdown:
    validate_loan_request(loan)

    principal = money(loan.principal)
    overdue_days = max(0, loan.actual_days_held - loan.planned_tenure_days)
    tier = get_tier_rule(loan.shri_score)

    regular_interest, base_rate_pct, effective_rate_pct, _ = calculate_regular_interest(
        principal=principal,
        actual_days_held=loan.actual_days_held,
        shri_score=loan.shri_score,
    )
    penalty_amount = calculate_penalty(
        principal=principal,
        overdue_days=overdue_days,
        partial_payments=loan.partial_payments,
    )

    lender_regular_interest = money(regular_interest * REGULAR_INTEREST_LENDER_SHARE)
    platform_regular_interest = money(regular_interest * REGULAR_INTEREST_PLATFORM_SHARE)
    lender_penalty_share = money(penalty_amount * PENALTY_LENDER_SHARE)
    platform_penalty_share = money(penalty_amount * PENALTY_PLATFORM_SHARE)

    lender_total_earnings = money(lender_regular_interest + lender_penalty_share)
    platform_total_earnings = money(platform_regular_interest + platform_penalty_share)
    total_repayment = money(principal + regular_interest + penalty_amount)

    shri_score_change, status_label, default_triggered = get_shri_score_change(
        actual_days_held=loan.actual_days_held,
        planned_tenure_days=loan.planned_tenure_days,
        overdue_days=overdue_days,
    )
    new_shri_score = apply_shri_score_change(loan.shri_score, shri_score_change, default_triggered)

    return RepaymentBreakdown(
        principal=principal,
        planned_tenure_days=loan.planned_tenure_days,
        actual_days_held=loan.actual_days_held,
        overdue_days=overdue_days,
        shri_score=loan.shri_score,
        tier=tier.name,
        tier_multiplier=tier.multiplier,
        base_cumulative_rate_pct=base_rate_pct,
        effective_interest_rate_pct=effective_rate_pct,
        regular_interest=regular_interest,
        penalty_amount=penalty_amount,
        total_repayment=total_repayment,
        lender_regular_interest=lender_regular_interest,
        platform_regular_interest=platform_regular_interest,
        lender_penalty_share=lender_penalty_share,
        platform_penalty_share=platform_penalty_share,
        lender_total_earnings=lender_total_earnings,
        platform_total_earnings=platform_total_earnings,
        shri_score_change=shri_score_change,
        new_shri_score=new_shri_score,
        status_label=status_label,
        default_triggered=default_triggered,
    )



def borrower_behavior_ratios(profile: BorrowerProfile) -> dict[str, float]:
    total_history = max(1, profile.historical_loans)
    return {
        "on_time_ratio": profile.on_time_repayments / total_history,
        "early_ratio": profile.early_repayments / total_history,
        "late_ratio": profile.late_repayments / total_history,
        "default_ratio": profile.defaults / total_history,
        "guarantor_default_ratio": profile.guarantor_defaults / total_history,
    }



def build_match_features(borrower: BorrowerProfile, lender: LenderProfile) -> dict[str, float]:
    tier = get_tier_rule(borrower.shri_score)
    ratios = borrower_behavior_ratios(borrower)
    requested_amount = float(dec(borrower.requested_amount))
    lender_ticket = float(dec(lender.max_ticket_size))
    inferred_limit = float(tier.max_loan_amount)
    score_gap = max(0, lender.min_shri_score - borrower.shri_score)
    tier_index = next(idx for idx, rule in enumerate(TIER_RULES, start=1) if rule.name == tier.name)

    amount_fit = min(1.0, lender_ticket / max(requested_amount, 1.0))
    tenure_fit = 1.0 - min(
        abs(borrower.requested_tenure_days - lender.preferred_tenure_days) / 90.0,
        1.0,
    )

    return {
        "borrower_score_norm": borrower.shri_score / 1000.0,
        "borrower_tier_norm": tier_index / len(TIER_RULES),
        "location_match": 1.0 if borrower.location.strip().lower() == lender.location.strip().lower() else 0.0,
        "college_match": 1.0 if lender.college and borrower.college.strip().lower() == lender.college.strip().lower() else 0.0,
        "loan_limit_utilization": min(1.0, requested_amount / max(inferred_limit, 1.0)),
        "requested_amount_norm": min(1.0, requested_amount / 10000.0),
        "requested_tenure_norm": min(1.0, borrower.requested_tenure_days / 90.0),
        "score_shortfall_norm": score_gap / 1000.0,
        "amount_fit": amount_fit,
        "tenure_fit": tenure_fit,
        "risk_tolerance": max(0.0, min(1.0, lender.risk_tolerance)),
        "funded_loans_norm": min(1.0, lender.funded_loans / 100.0),
        **ratios,
    }



def baseline_match_probability(features: Mapping[str, float]) -> float:
    weighted_sum = (
        2.2 * features["borrower_score_norm"]
        + 0.8 * features["borrower_tier_norm"]
        + 0.8 * features["location_match"]
        + 0.7 * features["college_match"]
        + 1.3 * features["on_time_ratio"]
        + 0.7 * features["early_ratio"]
        - 1.5 * features["late_ratio"]
        - 2.4 * features["default_ratio"]
        - 0.8 * features["guarantor_default_ratio"]
        - 0.9 * features["loan_limit_utilization"]
        - 1.1 * features["score_shortfall_norm"]
        + 0.9 * features["amount_fit"]
        + 0.8 * features["tenure_fit"]
        + 0.5 * features["risk_tolerance"]
        + 0.2 * features["funded_loans_norm"]
        - 0.6
    )
    return 1.0 / (1.0 + exp(-weighted_sum))



def rank_lenders_for_borrower(
    borrower: BorrowerProfile,
    lenders: Iterable[LenderProfile],
) -> list[LenderMatch]:
    ranked: list[LenderMatch] = []
    for lender in lenders:
        features = build_match_features(borrower, lender)
        probability = baseline_match_probability(features)
        ranked.append(
            LenderMatch(
                lender_id=lender.lender_id,
                score=round(probability * 100.0, 2),
                probability=round(probability, 6),
                features={key: round(value, 6) for key, value in features.items()},
            )
        )
    return sorted(ranked, key=lambda item: item.probability, reverse=True)



def build_training_row(
    borrower: BorrowerProfile,
    lender: LenderProfile,
    outcome_repaid_on_time: int | None = None,
) -> dict[str, float | int | str]:
    features = build_match_features(borrower, lender)
    row: dict[str, float | int | str] = {
        "borrower_id": borrower.borrower_id,
        "lender_id": lender.lender_id,
        **features,
    }
    if outcome_repaid_on_time is not None:
        row["outcome_repaid_on_time"] = int(outcome_repaid_on_time)
    return row



def _print_example(title: str, loan: LoanRequest) -> None:
    result = calculate_repayment(loan)
    print(f"\n{title}")
    print("-" * len(title))
    print(f"Tier: {result.tier}")
    print(f"Base rate: {result.base_cumulative_rate_pct}%")
    print(f"Effective rate: {result.effective_interest_rate_pct}%")
    print(f"Regular interest: Rs {result.regular_interest}")
    print(f"Penalty: Rs {result.penalty_amount}")
    print(f"Total repayment: Rs {result.total_repayment}")
    print(f"Lender earnings: Rs {result.lender_total_earnings}")
    print(f"Platform earnings: Rs {result.platform_total_earnings}")
    print(f"Shri Score change: {result.shri_score_change} ({result.status_label})")
    print(f"New Shri Score: {result.new_shri_score}")


if __name__ == "__main__":
    _print_example(
        "Scenario 1: Newbie, 4000 for 30 days, repaid on day 30",
        LoanRequest(principal=Decimal("4000"), planned_tenure_days=30, actual_days_held=30, shri_score=250),
    )
    _print_example(
        "Scenario 2: Platinum, 4000 for 30 days, repaid on day 10",
        LoanRequest(principal=Decimal("4000"), planned_tenure_days=30, actual_days_held=10, shri_score=900),
    )
    _print_example(
        "Scenario 3: Newbie, 4000 due day 1, repaid day 5",
        LoanRequest(principal=Decimal("4000"), planned_tenure_days=1, actual_days_held=5, shri_score=250),
    )
    _print_example(
        "Scenario 4: Any borrower, 4000 for 30 days, repaid within 24h",
        LoanRequest(principal=Decimal("4000"), planned_tenure_days=30, actual_days_held=1, shri_score=650),
    )

    borrower = BorrowerProfile(
        borrower_id="B-101",
        shri_score=780,
        location="Delhi",
        college="IIT Delhi",
        requested_amount=Decimal("4500"),
        requested_tenure_days=21,
        historical_loans=12,
        on_time_repayments=7,
        early_repayments=3,
        late_repayments=2,
        defaults=0,
    )
    lenders = [
        LenderProfile(
            lender_id="L-1",
            location="Delhi",
            college="IIT Delhi",
            min_shri_score=650,
            max_ticket_size=Decimal("5000"),
            preferred_tenure_days=21,
            risk_tolerance=0.70,
            funded_loans=15,
        ),
        LenderProfile(
            lender_id="L-2",
            location="Mumbai",
            college="IIT Bombay",
            min_shri_score=800,
            max_ticket_size=Decimal("2500"),
            preferred_tenure_days=7,
            risk_tolerance=0.30,
            funded_loans=45,
        ),
    ]

    print("\nTop lender matches")
    print("------------------")
    for match in rank_lenders_for_borrower(borrower, lenders):
        print(f"{match.lender_id}: probability={match.probability:.4f}, score={match.score}")
