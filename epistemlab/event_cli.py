"""Separate bounded stdin/file CLI with atomic checked output."""

import argparse
import json
import os
from pathlib import Path
import sys
import tempfile
from .events import update
from .event_oracle import verify_events


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Bounded S5 event-model product update"
    )
    parser.add_argument("input")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--output")
    args = parser.parse_args(argv)
    temp = None
    try:
        if args.input == "-":
            data = sys.stdin.buffer.read(8_000_001)
        else:
            with open(args.input, "rb") as f:
                data = f.read(8_000_001)
        if len(data) > 8_000_000:
            raise ValueError("Input exceeds 8,000,000 bytes")

        def pairs(xs):
            d = {}
            for k, v in xs:
                if k in d:
                    raise ValueError("Duplicate JSON key")
                d[k] = v
            return d

        value = json.loads(
            data,
            object_pairs_hook=pairs,
            parse_constant=lambda _: (_ for _ in ()).throw(
                ValueError("Nonfinite JSON")
            ),
        )
        if args.verify:
            if not verify_events(value):
                raise ValueError("Event evidence rejected")
            result = "Event evidence accepted\n"
        else:
            report = update(value)
            if not verify_events(report):
                raise ValueError("Generated event evidence failed independent replay")
            result = (
                json.dumps(report, indent=2, ensure_ascii=True, allow_nan=False) + "\n"
            )
        if args.output:
            dest = Path(args.output)
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=dest.parent, delete=False
            ) as f:
                temp = f.name
                f.write(result)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temp, dest)
            temp = None
        else:
            sys.stdout.write(result)
        return 0
    except (
        ValueError,
        OSError,
        TypeError,
        KeyError,
        IndexError,
        OverflowError,
        RecursionError,
    ) as e:
        print(str(e), file=sys.stderr)
        return 2
    finally:
        if temp is not None:
            os.unlink(temp)


if __name__ == "__main__":
    sys.exit(main())
