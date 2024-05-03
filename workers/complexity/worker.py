import textstat
import jsonschema

def handler(event, context):
    print('Received event: {}'.format(event))
    validator = jsonschema.Draft202012Validator({
        "type" : "object",
        "properties" : {
            "id" : {"type" : "string", "minLength": 1},
            "entry" : {"type" : "string", "minLength": 1},
        },
        "required": ["id", "entry"],
    })

    errors = validator.iter_errors(event)  # get all validation errors

    message = []
    for error in errors:
        message.append(error.message)

    if message:
        raise ValueError('Validation of payload failed: {}'.format(', '.join(message)))

    return {
        # The measure of the readability of a text based on the
        # average number of syllables per word and words per sentence.
        # Higher values indicate more complex language
        # ----------------------------------------------
        # Minimum Value: 0 (easiest)
        # Maximum Value: 100 (most difficult)
        'flesch_kincaid_grade_level': textstat.flesch_kincaid_grade(event['entry']),
        # A score that indicates how easy or difficult a text is to read.
        # Higher scores indicate easier readability, while lower scores indicate more complex text.
        # ----------------------------------------------
        # Minimum Value: 0 (most difficult)
        # Maximum Value: 100 (easiest)
        'flesch_reading_ease': textstat.flesch_reading_ease(event['entry']),
        # The Gunning Fog Index is a readability formula that estimates the years of formal education
        # required to understand a piece of text. It considers the average number of words per sentence
        # and the percentage of complex words (words with three or more syllables) in the text.
        # ----------------------------------------------
        # Minimum Value: 0 (easiest)
        # Maximum Value: No upper limit, but typically ranges from 6 to 20+
        'gunning_fog_index': textstat.gunning_fog(event['entry']),
        # The SMOG Index (Simple Measure of Gobbledygook) is another readability formula
        # that estimates the years of education needed to understand a text.
        # It calculates the index based on the number of complex words (words with three
        # or more syllables) in a sample of text.
        # ----------------------------------------------
        # Minimum Value: 0 (easiest)
        # Maximum Value: No upper limit, but typically ranges from 6 to 20+
        'smog_index': textstat.smog_index(event['entry']),
        # Another readability index similar to Flesch-Kincaid Grade Level,
        # estimating the years of education needed to understand the text.
        # Minimum Value: 0 (easiest)
        # Maximum Value: No upper limit, but typically corresponds to grade levels (e.g., 12 for 12th grade)
        'automated_readability_index': textstat.automated_readability_index(event['entry']),
        # A readability index that calculates the grade level required
        # to understand the text based on characters per word and sentences per 100 words.
        # ----------------------------------------------
        # Minimum Value: -3 (rarely used in practice)
        # Maximum Value: No upper limit, but typically corresponds to grade levels (e.g., 12 for 12th grade)
        'coleman_liau_index': textstat.coleman_liau_index(event['entry']),
        # The Linsear Write Formula is a readability formula that estimates the readability
        # of a text based on the number of simple and complex words in a sample.
        # It considers words with one or two syllables as simple words and words with three
        #  or more syllables as complex words.
        # ----------------------------------------------
        # Minimum Value: 0 (easiest)
        # Maximum Value: Typically ranges from 0 to 20+
        'linsear_write_formula': textstat.linsear_write_formula(event['entry']),
        # The Dale-Chall Readability Score is a readability formula that estimates the readability
        # of a text by considering a list of "easy" words. The formula calculates the percentage
        # of words in a text that are not on the list of easy words.
        # ----------------------------------------------
        # Minimum Value: 0 (easiest)
        # Maximum Value: No upper limit, but typically corresponds to grade levels (e.g., 12 for 12th grade)
        'dale_chall_readability_score': textstat.dale_chall_readability_score(event['entry']),
        # The Readability Consensus score is an average of several readability formulas,
        # including Flesch Reading Ease, Flesch-Kincaid Grade Level, Coleman-Liau Index,
        # Automated Readability Index, and Dale-Chall Readability Score.
        # This composite score provides an overall assessment of text readability,
        # considering multiple factors.
        # ----------------------------------------------
        # Minimum Value: 0 (most difficult)
        # Maximum Value: Typically ranges from 0 to 100, with higher values indicating easier readability.
        'readability_consensus': textstat.text_standard(event['entry'], float_output=True)
    }
