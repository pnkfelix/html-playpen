// -*- mode: js; indent-tabs-mode:nil; tab-width: 4 -*-

// X-Exprs were a really cool trick I saw at Northeastern for defining
// a subset of Lisp S-Exprs that sufficed for expressing arbitrary XML
// content with very little syntactic overhead.  For HTML pages, often
// the encoding was more efficient than the equivalent HTML (in my
// opinion), mainly due to implicit closing tags.
//
// J-Exprs are my attempt to do the same trick, but atop JSON, for
// ease of transmission between different services (JSON seems like a
// popular and easy format to support).  Note that in my pidgen JSON
// below, I am not wrapping the keys on Object.
//
// Note that there is a categorical danger introduced when handling
// arbitrary HTML, namely in whether an HTML document is a single
// tag-form, or a *sequence* of tag forms.
// I.e., what is:
//    <p>Hello world</p> <p>Hello yourself</p>
// Is it one expression, or a series of two expressions?
//
// If you conflate them into one category that you want to handle
// universally, then you may need to take care to not conflate
// a unary sequence of a singleton form: <tag/>
// with an empty container form: <tag> </tag>
//
// In my original draft, I did conflate all HTML into one category,
// and then handled distinquishing the two cases above with an
// ugly extra tag thrown into the representation somewhat randomly.
//
// A little bit of coding made me realize that I would be better
// served by distinquishing J-Seq's from J-Expr's, since the code
// processing each kind of thing is likely to have preconceptions of
// what it is receiving anyway.


// (My hope is that this format will be easier for me to generate and
// to pre-process.  I suppose I could also attempt to map the DOM
// itself into this format.)

// Html HH                                JExpr J(HH)
// ===============================        =============================
// Normal text                            "Normal text"
// <tag/>                                 {tag:{}}
// <tag a="foo" b="bar" ... />            {tag:{a:"foo", b:"bar", ...}}
// <tag a="foo" b="bar" ...></tag>        [{tag:{a:"foo", b:"bar", ...}}]
// <tag> HH ... </tag>                    [{tag:{}} J(HH), ... ]
// <tag a="foo" ...> HH ... </tag>        [{tag:{a:"foo", ...}}, J(HH), ...]
//
// Also, it makes some amount of sense to support the HTML notation:
//
// Html Sequence                          JSeq S(HH)
// ===============================        =============================
// HH ...                                 [J(HH), ...]
//
// But note that the latter is not a proper J-Expr, but rather a J-Seq

// Note also that the representations intersect; thus, it is the duty
// of the coder to not pass JExprs where JSeq's are intended, or
// vice-versa.

// So:
// A JAttrs is an object {k1:S1, k2:S2, ...}
//   i.e. an object of keys all mapping to *string* values
//
// A JTag is an object {T : JAttrs}
//   where T is a String key
//
// A JExpr is either:
// -- A String
// -- A JTag
// -- An Array [JTag, elements...]
//
// A JSeq is an Array of J-Expr


// OLD OUTDATED NOTES FROM WHEN I CONFLATED J-EXPR and J-SEQ
//
// Note also that I cannot have HH ... map to [J(HH) ...] and also
// have <tag/> map to {tag:{}}, as I had originally intended;
// because then [{t1:{}} {t2:{}}] would be ambiguous between
// the cases of:
//   <tag1/> <tag2/>
// and
//   <tag1> <tag2/> </tag1>
// Even [{tag:{}}] poses a problem in this context.
//
// Merely requiring the forms to be wrapped in arrays does not
// suffice, because then we lose expressive power.
//
// So to deal with this, I (unfortunately) require singleton <tag/>
// forms to be wrapped in an array and also end with an explicit null.
// These two additions may make the encoding sufficiently ugly that I
// may abandon it and return back to HTML directly, we shall see.
//
// There is potentially an argument that I would be better served by
// not attempting to support encoding of <tag/>.  Then all tags would
// take the uniform form [{tag:ATTROBJ}, ELEMS...]  Its not even clear
// whether I can express the distinction in the objects I myself
// dynamically create in the DOM.  But for now I want to allow the
// possibility of expressing the distinction, even if it adds the ugly
// null case in all the J-Expr processing
//
// Note that since no case of J-Expr is a bare unwrapped Object, while
// J-tag is a (trivial) object, it is easy to distinguish the case
// analysis in J-Expr.
//
// END OF OLD OUTDATED NOTES FROM WHEN I CONFLATED J-EXPR AND J-SEQ


// See: http://bonsaiden.github.com/JavaScript-Garden/#types.typeof
var is =
    (function () {
        function is(type) {
            return function (obj) {
                var clas = Object.prototype.toString.call(obj).slice(8, -1);
                return obj !== undefined && obj !== null && clas == type;
            }
        };
        var x = {};
        x.String    = is("String");
        x.Arguments = is("Arguments");
        x.Array     = is("Array");
        x.Boolean   = is("Boolean");
        x.Date      = is("Date");
        x.Error     = is("Error");
        x.Function  = is("Function");
        x.JSON      = is("JSON");
        x.Math      = is("Math");
        x.Number    = is("Number");
        x.Object    = is("Object");
        x.RegExp    = is("RegExp");
        x.String    = is("String");
        return x;
    })();


function die() { throw new Error("Program Malfunction"); }
function assert(p) { if (!p) die(); }

function casesJExpr(visitStr, visitTagNull, visitTag) {
    function die() { throw new Error("Malformed JExpr"); }
    function assert(p) { if (!p) die(); }

    function jtagName(x) {
        var t = null; for (k in x) { assert(t == null); t = k; }
        return t;
    }
    function jtagAttrs(x) { assert(x); var t = jtagName(x); return x[t]; }

    return function(je) {
        if (is.String(je)) { return visitStr(je); }
        else if (is.Object(je)) { return visitTagNull(jtagName(je),
                                                      jtagAttrs(je)); }
        else if (is.Array(je)) {
            assert(je.length > 0);
            var t = je[0];
            return visitTag(jtagName(t), jtagAttrs(t), je.slice(1));
        }
    }
}

function convJExprToDOM(jexpr) {
    function str(x) {
        return document.createTextNode(x);
    }
    function tNull(x, attrs) {
        var e = document.createElement(x);
        for (k in attrs) {
            e.setAttribute(k, attrs[k]);
        }
        assert(e != null);
        return e;
    }
    function t(x, attrs, elems) {
        var e = tNull(x, attrs);
        for (var i = 0; i < elems.length; i++) {
            var c = convJExprToDOM(elems[i]);
            e.appendChild(c);
        }
        assert(e != null);
        return e;
    }

    return casesJExpr(str, tNull, t)(jexpr);
}

var body =
    [[{hgroup:{}}
      , [{h1:{}}, '"Simple" Arithmetic Interpreter']
      , [{h2:{}}, 'an exercise in PL implementation within HTML5']]
     ,
     [{section:{id:"bootstrap"}}
      // bootstrap section could get also filled in by the associated
      // javascript program with all the programs it wants to support
      // at bootstrap time
      //
      // But since I'm now already sitting in Javascript, we will do
      // it directly in this JSON for now.
      , [{button:{id:"identityButton"}}, 'identity']
      , [{button:{id:"arithmeticButton"}}, 'arithmetic']]
     ,
     {input:{type:"text", id:"exprField"}}
     ,
     [{button:{id:"evalButton"}}, 'eval']
     ,
     [{section:{id:"answer"}}]
    ];

function setTitle(title) {
    document.title = title;

    // The below does not work.
    // see
    //   http://bytes.com/topic/javascript/answers/148055-how-do-i-change-document-title
    // for potential explanations.
    //
    // But the above is certainly simple enough.

    if (false) {
        var t =document.getElementsByTagName('title');
        t.removeChild(t.lastChild);
        t.appendChild(document.createTextNode("Hello There From Title"));
    }
}

// See
//  http://stackoverflow.com/questions/3955229/remove-all-child-elements-of-a-dom-node-in-javascript
function clearChildren(x) {
    // One way
    if (true) {
        while (x.firstChild) {
            x.removeChild(x.firstChild);
        }
        return x;
    } else if (false) {
        // Another potential way
        x.innerHTML = '';
        return x;
    } else if (false) {
        // not really the same but potentially of interest nonetheless
        return x.cloneNode(false);
    }
}

function jsload() {

    function marshalBody(body) {
        var bs = document.getElementsByTagName('body');
        var b = bs[0];
        for (var i=0; i < body.length; i++) {
            var e = convJExprToDOM(body[i]);
            //b.appendChild(document.createTextNode(e.toString()))
            b.appendChild(e);
        }
    }

    function linkInterpreter(buttonId, loader) {
        var b = document.getElementById(buttonId);
        b.onclick = loader;
    }

    setTitle('Generic Interpreter');
    //setTitle('"Simple" Arithmetic Interpreter');

    marshalBody(body);

    linkInterpreter('identityButton', loadIdentityInterp);
    linkInterpreter('arithmeticButton', loadArithmeticInterp);
}

function loadIdentityInterp () {
    setTitle("Loading Identity Interpreter");
    var x = document.getElementById("answer");
    var s = document.getElementById("evalButton");
    var t = document.getElementById("exprField");
    s.onclick = function() {
        // Oh pedantry.
        function id(x) { return x; }
        var answer = id(t.value);

        clearChildren(x);
        x.appendChild(document.createTextNode(t.value));
    }
    setTitle("Identity Interpreter");
}

function loadArithmeticInterp () {
    setTitle("Loading Arithmetic Interpreter");
    var x = document.getElementById("answer");
    var s = document.getElementById("evalButton");
    var t = document.getElementById("exprField");
    s.onclick = function() {
        // Such an obvious security hole it is not even funny.
        var answer = eval(t.value);

        clearChildren(x);
        x.appendChild(document.createTextNode(answer));
    }
    setTitle("Arithmetic Interpreter");
}
