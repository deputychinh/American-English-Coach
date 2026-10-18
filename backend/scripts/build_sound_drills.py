"""Build `content/sound_drills.json`: validated practice material for every chart sound.

Candidates are authored below; CMUdict decides which survive (the target phone must occur in a
dictionary pronunciation, minimal pairs must differ in the target, every sentence word must be
pronounceable). Run: `uv run python scripts/build_sound_drills.py`.
"""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.domain.phoneme_inventory import Phone  # noqa: E402
from app.domain.pronouncing import PronouncingDictionary  # noqa: E402

MIN_WORDS = 6
MIN_SENTENCES = 2

# id → (words, pairs, [(sentence, kind)])
CANDIDATES: dict[str, tuple[list[str], list[tuple[str, str]], list[tuple[str, str]]]] = {
    "v01": (
        ["see", "sheep", "eat", "green", "teach", "feel", "meet", "key", "three", "peace"],
        [("seat", "sit"), ("sheep", "ship"), ("leave", "live"), ("feel", "fill")],
        [("Please keep the green tea.", "statement"), ("Do we need three seats?", "question")],
    ),
    "v02": (
        ["sit", "ship", "big", "fish", "milk", "give", "little", "fill", "hit", "ill"],
        [("sit", "seat"), ("ship", "sheep"), ("fill", "feel"), ("hit", "heat")],
        [("Sit in this big chair.", "statement"), ("Give him a little fish.", "statement")],
    ),
    "v03": (
        ["bed", "red", "ten", "head", "said", "egg", "friend", "pen", "yes", "next"],
        [("bed", "bad"), ("pen", "pan"), ("men", "man"), ("said", "sad")],
        [("Ten red pens are on the bed.", "statement"), ("Did my friend say yes?", "question")],
    ),
    "v04": (
        ["cat", "bad", "hat", "man", "apple", "black", "happy", "hand", "bag", "map"],
        [("cat", "cut"), ("bad", "bed"), ("hat", "hot"), ("man", "men")],
        [
            ("The black cat sat on the bag.", "statement"),
            ("That man has a happy family.", "statement"),
        ],
    ),
    "v05": (
        ["father", "car", "star", "heart", "calm", "dark", "farm", "art", "park", "hard"],
        [("car", "care"), ("heart", "hurt"), ("far", "fur"), ("barn", "burn")],
        [("My father parks the car.", "statement"), ("Is the farm dark at night?", "question")],
    ),
    "v06": (
        ["hot", "not", "box", "father", "clock", "shop", "rock", "calm", "problem", "stop"],
        [("hot", "hut"), ("not", "nut"), ("cot", "cut"), ("shop", "ship")],
        [
            ("I got a lot of hot coffee.", "statement"),
            ("The doctor has a problem with the clock.", "statement"),
        ],
    ),
    "v07": (
        ["thought", "saw", "talk", "ball", "all", "call", "door", "more", "four", "draw"],
        [("law", "low"), ("caught", "coat"), ("ball", "bowl"), ("call", "coal")],
        [("We all walk and talk.", "statement"), ("Can you call me before four?", "question")],
    ),
    "v08": (
        ["book", "look", "wood", "foot", "put", "cook", "would", "should", "full", "push"],
        [("pull", "pool"), ("full", "fool"), ("look", "luke"), ("could", "cooed")],
        [("Look at the good book.", "statement"), ("Put your foot here and push.", "statement")],
    ),
    "v09": (
        ["food", "moon", "blue", "school", "two", "you", "who", "new", "true", "choose"],
        [("pool", "pull"), ("fool", "full"), ("food", "foot"), ("suit", "soot")],
        [("The moon is blue tonight.", "statement"), ("Who chose the new school?", "wh_question")],
    ),
    "v10": (
        ["cup", "bus", "love", "come", "money", "sun", "mother", "much", "fun", "run"],
        [("cup", "cap"), ("cut", "cat"), ("but", "bat"), ("luck", "lack")],
        [("Come and have some fun.", "statement"), ("Does your mother love the sun?", "question")],
    ),
    "v11": (
        ["bird", "work", "world", "girl", "first", "learn", "word", "turn", "nurse", "early"],
        [("bird", "bad"), ("work", "walk"), ("hurt", "heart"), ("burn", "barn")],
        [("The girl learns at work first.", "statement"), ("Turn to the first word.", "statement")],
    ),
    "v12": (
        ["about", "banana", "sofa", "lemon", "again", "seven", "famous", "pencil", "open", "ago"],
        [("about", "a bout"), ("today", "to day")],
        [
            ("Tell me about the banana today.", "statement"),
            ("Open the pencil box again.", "statement"),
        ],
    ),
    "d01": (
        ["day", "make", "rain", "late", "name", "play", "eight", "great", "table", "wait"],
        [("day", "die"), ("late", "light"), ("pain", "pine"), ("main", "mine")],
        [("They play all day.", "statement"), ("Wait, is the table late?", "question")],
    ),
    "d02": (
        ["my", "time", "like", "five", "night", "white", "eye", "buy", "light", "find"],
        [("my", "may"), ("light", "late"), ("bite", "bait"), ("time", "tame")],
        [("I like the white light.", "statement"), ("Buy five at nine tonight.", "statement")],
    ),
    "d03": (
        ["boy", "toy", "voice", "choice", "enjoy", "join", "noise", "oil", "point", "coin"],
        [("boy", "buy"), ("toy", "tie"), ("boil", "bile"), ("coin", "cane")],
        [("The boy enjoys his toy.", "statement"), ("Join us and make a choice.", "statement")],
    ),
    "d04": (
        ["go", "no", "home", "phone", "know", "open", "show", "boat", "coat", "road"],
        [("coat", "caught"), ("boat", "bought"), ("low", "law"), ("so", "saw")],
        [("Go home and phone me.", "statement"), ("Show me the road to the boat.", "statement")],
    ),
    "d05": (
        ["now", "how", "house", "out", "down", "town", "brown", "cow", "mouth", "loud"],
        [("how", "hoe"), ("now", "no"), ("town", "tone"), ("found", "fond")],
        [("Go down to the town now.", "statement"), ("How loud is the brown cow?", "wh_question")],
    ),
    "d06": (
        ["near", "beard", "deer", "year", "beer", "clear", "dear", "fear", "cheer", "steer"],
        [("near", "knee"), ("beard", "he"), ("beer", "bee"), ("fear", "fee")],
        [
            ("Come near the clear water.", "statement"),
            ("Can you steer clear this year?", "question"),
        ],
    ),
    "d07": (
        ["chair", "hair", "there", "where", "care", "air", "pair", "share", "bear", "wear"],
        [("chair", "chain"), ("hair", "hay"), ("bear", "bay"), ("care", "kay")],
        [
            ("Where is the chair over there?", "wh_question"),
            ("Share the air and take care.", "statement"),
        ],
    ),
    "d08": (
        [
            "pure",
            "jury",
            "tour",
            "sure",
            "cure",
            "europe",
            "mature",
            "tourist",
            "assure",
            "secure",
        ],
        [("tour", "tore"), ("jury", "pour"), ("sure", "shore"), ("pure", "peer")],
        [
            ("I am sure the tour is pure fun.", "statement"),
            ("Is the tourist secure during the tour?", "question"),
        ],
    ),
    "c01": (
        ["pen", "pay", "happy", "apple", "stop", "cup", "top", "keep", "paper", "sleep"],
        [("pen", "ben"), ("pay", "bay"), ("cap", "cab"), ("pack", "back")],
        [("Put the paper cup on top.", "statement"), ("Pay for the pen and stop.", "statement")],
    ),
    "c02": (
        ["bad", "big", "baby", "about", "job", "web", "cab", "book", "boy", "table"],
        [("bad", "pad"), ("big", "pig"), ("cab", "cap"), ("bay", "pay")],
        [("The big baby has a job.", "statement"), ("Bring the book to the table.", "statement")],
    ),
    "c03": (
        ["ten", "time", "tea", "cat", "eat", "sit", "hot", "get", "table", "stop"],
        [("ten", "den"), ("two", "do"), ("tie", "die"), ("cat", "cad")],
        [("Ten cats sit on the mat.", "statement"), ("Take the time to eat.", "statement")],
    ),
    "c04": (
        ["day", "do", "dog", "red", "bed", "good", "friend", "read", "door", "idea"],
        [("do", "to"), ("die", "tie"), ("bed", "bet"), ("bad", "bat")],
        [("The dog had a good day.", "statement"), ("Read in bed, my friend.", "statement")],
    ),
    "c05": (
        ["cat", "key", "car", "look", "back", "make", "kick", "cook", "school", "black"],
        [("coat", "goat"), ("cap", "gap"), ("back", "bag"), ("cold", "gold")],
        [
            ("The cat can kick the black box.", "statement"),
            ("Cook and look at the clock.", "statement"),
        ],
    ),
    "c06": (
        ["go", "get", "good", "big", "dog", "give", "game", "bag", "egg", "girl"],
        [("goat", "coat"), ("gap", "cap"), ("bag", "back"), ("gold", "cold")],
        [("The girl gave the dog a big egg.", "statement"), ("Go get a good game.", "statement")],
    ),
    "c07": (
        ["fan", "fish", "five", "coffee", "life", "leaf", "off", "half", "phone", "laugh"],
        [("fan", "van"), ("fine", "vine"), ("leaf", "leave"), ("safe", "save")],
        [
            ("Five fish in the coffee cup.", "statement"),
            ("Laugh at life, not at the phone.", "statement"),
        ],
    ),
    "c08": (
        ["van", "very", "voice", "seven", "love", "live", "five", "give", "have", "over"],
        [("van", "fan"), ("vine", "fine"), ("leave", "leaf"), ("vest", "west")],
        [("I love the very loud voice.", "statement"), ("Give seven to have five.", "statement")],
    ),
    "c09": (
        ["thin", "think", "three", "thank", "bath", "mouth", "month", "tooth", "both", "through"],
        [
            ("thin", "tin"),
            ("think", "sink"),
            ("three", "tree"),
            ("bath", "bat"),
            ("mouth", "mouse"),
        ],
        [
            ("I think both teeth hurt this month.", "statement"),
            ("Thank you for the three baths.", "statement"),
        ],
    ),
    "c10": (
        ["this", "that", "the", "they", "mother", "father", "brother", "them", "breathe", "smooth"],
        [("they", "day"), ("than", "dan"), ("breathe", "breeze"), ("then", "den")],
        [
            ("This is my mother and that is my father.", "statement"),
            ("They bathe with their brother.", "statement"),
        ],
    ),
    "c11": (
        ["see", "sun", "sit", "bus", "yes", "class", "city", "face", "nice", "pass"],
        [("see", "she"), ("sip", "ship"), ("sue", "zoo"), ("bus", "buzz"), ("sink", "think")],
        [("See the sun set on the bus.", "statement"), ("Yes, the city is nice.", "statement")],
    ),
    "c12": (
        ["zoo", "zero", "busy", "music", "easy", "nose", "eyes", "please", "cheese", "rose"],
        [("zoo", "sue"), ("buzz", "bus"), ("eyes", "ice"), ("rise", "rice"), ("prize", "price")],
        [
            ("Please visit the zoo at noon.", "statement"),
            ("His nose and eyes are easy to see.", "statement"),
        ],
    ),
    "c13": (
        ["she", "shop", "ship", "fish", "wish", "push", "wash", "nation", "sure", "special"],
        [("she", "see"), ("ship", "sip"), ("shave", "save"), ("show", "so"), ("shell", "sell")],
        [
            ("She sells fresh fish in the shop.", "statement"),
            ("Wash and push the ship.", "statement"),
        ],
    ),
    "c14": (
        [
            "vision",
            "measure",
            "pleasure",
            "usual",
            "treasure",
            "television",
            "garage",
            "casual",
            "decision",
            "beige",
        ],
        [("vision", "mission"), ("pleasure", "pressure"), ("leisure", "leash")],
        [
            ("It is a pleasure to measure the treasure.", "statement"),
            ("Was that the usual television decision?", "question"),
        ],
    ),
    "c15": (
        ["hat", "he", "hello", "home", "happy", "hand", "hot", "house", "who", "behind"],
        [("hat", "at"), ("hear", "ear"), ("hold", "old"), ("hand", "and")],
        [("He has a happy home.", "statement"), ("Who is behind the house?", "wh_question")],
    ),
    "c16": (
        [
            "cheap",
            "chair",
            "child",
            "teacher",
            "kitchen",
            "watch",
            "lunch",
            "church",
            "much",
            "chocolate",
        ],
        [
            ("cheap", "jeep"),
            ("chip", "ship"),
            ("catch", "cash"),
            ("choke", "joke"),
            ("cheer", "jeer"),
        ],
        [
            ("The teacher eats lunch in the kitchen.", "statement"),
            ("Watch the child in church.", "statement"),
        ],
    ),
    "c17": (
        ["jeep", "job", "juice", "jump", "orange", "bridge", "age", "language", "page", "enjoy"],
        [("jeep", "cheap"), ("joke", "choke"), ("gin", "chin"), ("jeer", "cheer")],
        [
            ("Enjoy the orange juice on the bridge.", "statement"),
            ("Is the job on page one?", "question"),
        ],
    ),
    "c18": (
        ["my", "mother", "man", "make", "some", "home", "time", "name", "summer", "team"],
        [("mine", "nine"), ("map", "nap"), ("some", "sun"), ("team", "teen")],
        [("My mother makes time for me.", "statement"), ("Name some summer teams.", "statement")],
    ),
    "c19": (
        ["no", "name", "nine", "night", "run", "sun", "ten", "moon", "dinner", "open"],
        [("no", "low"), ("nine", "mine"), ("nap", "map"), ("sun", "some"), ("sin", "sing")],
        [("Nine nights, no moon.", "statement"), ("Run to dinner at ten.", "statement")],
    ),
    "c20": (
        ["sing", "ring", "long", "song", "thing", "morning", "bring", "young", "king", "strong"],
        [("sing", "sin"), ("thing", "thin"), ("sung", "sun"), ("bang", "ban"), ("wing", "win")],
        [
            ("Sing a long song this morning.", "statement"),
            ("Is the young king strong?", "question"),
        ],
    ),
    "c21": (
        ["light", "like", "look", "little", "play", "yellow", "ball", "school", "call", "feel"],
        [
            ("light", "right"),
            ("lead", "read"),
            ("long", "wrong"),
            ("collect", "correct"),
            ("play", "pray"),
        ],
        [
            ("Look at the little yellow ball.", "statement"),
            ("I like to play all day.", "statement"),
        ],
    ),
    "c22": (
        ["right", "red", "run", "read", "very", "sorry", "car", "door", "three", "green"],
        [
            ("right", "light"),
            ("read", "lead"),
            ("wrong", "long"),
            ("correct", "collect"),
            ("pray", "play"),
        ],
        [
            ("Run right to the red door.", "statement"),
            ("Sorry, can you read it three times?", "question"),
        ],
    ),
    "c23": (
        ["yes", "you", "year", "yellow", "young", "use", "music", "few", "cute", "yard"],
        [("yes", "less"), ("year", "ear"), ("yet", "jet"), ("yam", "jam")],
        [("You use new music every year.", "statement"), ("The young man says yes.", "statement")],
    ),
    "c24": (
        ["we", "water", "want", "work", "world", "window", "white", "sweet", "away", "always"],
        [("west", "vest"), ("wine", "vine"), ("wet", "vet"), ("wow", "vow")],
        [("We want sweet water.", "statement"), ("Does the white window always work?", "question")],
    ),
}


def pattern_tokens(pattern: str) -> list[list[tuple[str, int | None]]]:
    """`AH1,AH2` → alternatives; `IH R` → a sequence. Returns alternatives of sequences."""
    alternatives: list[list[tuple[str, int | None]]] = []
    for alternative in pattern.split(","):
        sequence: list[tuple[str, int | None]] = []
        for token in alternative.split():
            if token[-1].isdigit():
                sequence.append((token[:-1], int(token[-1])))
            else:
                sequence.append((token, None))
        alternatives.append(sequence)
    return alternatives


def contains(phones: tuple[Phone, ...], pattern: str) -> bool:
    """Does a pronunciation contain the pattern (any alternative, consecutive sequence)?"""
    for sequence in pattern_tokens(pattern):
        for start in range(len(phones) - len(sequence) + 1):
            window = phones[start : start + len(sequence)]
            if all(
                phone.symbol == symbol and (stress is None or phone.stress == stress)
                for phone, (symbol, stress) in zip(window, sequence, strict=True)
            ):
                return True
    return False


def position(phones: tuple[Phone, ...], pattern: str) -> str:
    """Initial / medial / final position of the first match (for display)."""
    first = pattern_tokens(pattern)[0]
    for start in range(len(phones) - len(first) + 1):
        if contains(phones[start : start + len(first)], pattern):
            if start == 0:
                return "initial"
            return "final" if start + len(first) == len(phones) else "medial"
    return "medial"


def main() -> int:
    """Validate the candidates and write the JSON; exit 1 when a sound lacks material."""
    dictionary = PronouncingDictionary.load(ROOT / "vendor" / "cmudict.dict")
    with (ROOT / "content" / "phonemes.tsv").open(encoding="utf-8") as source:
        chart = list(csv.DictReader(source, delimiter="\t"))
    drills: list[dict[str, object]] = []
    problems: list[str] = []
    for row in chart:
        words, pairs, sentences = CANDIDATES[row["id"]]
        pattern = row["pattern"]

        def has(word: str, pat: str = pattern) -> bool:
            entry = dictionary.lookup(word)
            return entry is not None and any(contains(v, pat) for v in entry.variants)

        def always_has(word: str, pat: str = pattern) -> bool:
            # The scorer picks the variant closest to what it heard; a drill word whose other
            # variant lacks the target ("ear" IH R / IY R, "law" AO / AA) then has nothing to
            # score and the mirror said "not heard" to a learner who said it right.
            entry = dictionary.lookup(word)
            return entry is not None and all(contains(v, pat) for v in entry.variants)

        kept_words = [
            {"word": w, "position": position(dictionary.lookup(w).primary, pattern)}  # type: ignore[union-attr]
            for w in words
            if always_has(w)
        ]
        kept_pairs = [
            [a, b] for a, b in pairs if has(a) and dictionary.lookup(b) is not None and not has(b)
        ]
        kept_sentences = []
        for text, kind in sentences:
            tokens = dictionary.tokenize(text)
            if all(dictionary.lookup(t) for t in tokens) and any(has(t) for t in tokens):
                kept_sentences.append({"text": text, "kind": kind})
        dropped = [w for w in words if not always_has(w)]
        if len(kept_words) < MIN_WORDS or len(kept_sentences) < MIN_SENTENCES:
            problems.append(
                f"{row['id']} {pattern}: words={len(kept_words)} "
                f"sentences={len(kept_sentences)} dropped={dropped}"
            )
        drills.append(
            {
                "id": row["id"],
                "symbol": row["symbol"],
                "us": row["us"],
                "arpabet": pattern,
                "group": row["group"],
                "words": kept_words,
                "pairs": kept_pairs,
                "sentences": kept_sentences,
                "dropped": dropped,
            }
        )
    (ROOT / "content" / "sound_drills.json").write_text(
        json.dumps(drills, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    for problem in problems:
        print(problem)
    print(f"{len(drills)} sounds; {sum(len(d['words']) for d in drills)} words")  # type: ignore[arg-type]
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
