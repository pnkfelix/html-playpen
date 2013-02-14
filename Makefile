all: ascii-art-assist.html

%.html: %.md
	./Markdown.pl $< > $@
