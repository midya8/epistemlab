import json, sys
from . import analyze, verify
from .disclosures import atlas
from .disclosure_oracle import verify_atlas


def main():
    try:
        if len(sys.argv) != 3 or sys.argv[1] not in [
            "analyze",
            "verify", "disclosures", "verify-disclosures",
        ]:
            raise ValueError("Usage: epistemlab analyze|verify|disclosures|verify-disclosures file.json")
        with open(sys.argv[2]) as f:
            value = json.load(f)
        command = sys.argv[1]
        if command in ["verify", "verify-disclosures"]:
            checker = verify if command == "verify" else verify_atlas
            if not checker(value):
                raise ValueError("Evidence rejected")
            print("Evidence accepted")
        else:
            print(
                json.dumps(
                    (atlas(value) if command == "disclosures" else analyze(value)),
                    indent=2,
                )
            )
    except (ValueError, OSError, TypeError) as e:
        print(str(e), file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
