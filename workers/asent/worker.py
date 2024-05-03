import spacy
import asent
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

    nlp = spacy.blank('en')
    nlp.add_pipe('sentencizer')
    nlp.add_pipe("asent_en_v1")

    doc = nlp(event['entry'])
    result = doc._.polarity.to_dict()

    return {key: result[key] for key in result.keys() & {"negative", "positive", "neutral"}}
