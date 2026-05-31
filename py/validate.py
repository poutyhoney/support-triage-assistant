from dataclasses import dataclass, field
from pydantic import ValidationError
from models import TriageResult


@dataclass
class ValidationResult:
    """
    Compare to validate.ts:
    - TS used a discriminated union type
    - Python uses a dataclass with optional fields
    Same concept, different syntax.
    """
    valid:  bool
    value:  TriageResult | None = None
    errors: list[str]           = field(default_factory=list)


def validate_triage(obj: object) -> ValidationResult:
    """
    The key comparison point between JS/TS and Python.

    validate.ts:  ~30 lines of manual field checks
    validate.py:  Pydantic handles all of it — enum validation, type checking,
                  required fields, and structured error messages are automatic.

    The corrective hint in triage.py gets Pydantic's own error descriptions,
    which are more precise than the hand-written ones in the JS/TS version.
    """
    try:
        result = TriageResult.model_validate(obj)
        return ValidationResult(valid=True, value=result)
    except ValidationError as err:
        errors = [
            f"{'.'.join(str(loc) for loc in e['loc'])}: {e['msg']}"
            for e in err.errors()
        ]
        return ValidationResult(valid=False, errors=errors)
