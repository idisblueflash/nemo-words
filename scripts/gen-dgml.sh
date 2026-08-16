#!/usr/bin/env bash
# Generate a DGML dependency graph for a directory of Clojure source files.
#
# Usage:
#   scripts/gen-dgml.sh [SRC_DIR] [OUT_FILE]
#
# Defaults:
#   SRC_DIR  = src/nemo_words
#   OUT_FILE = docs/nemo_words.dgml
#
# What it does:
#   For every top-level (def/defn/defn-) form in each *.clj file in SRC_DIR,
#   emits a DGML node grouped under its namespace, and draws "Calls" edges
#   by regex-scanning each form's body for:
#     - other symbol names defined in the same namespace
#     - alias/symbol references resolved via that file's :require :as map
#       (edges to symbols in another SRC_DIR namespace link directly to
#       that symbol's node; anything else becomes an external-library node)
#
# This is a heuristic text scan, not a real Clojure reader: no macro
# expansion, no shadowing/scope analysis, self-recursive calls are
# suppressed to avoid trivial self-loops. Good enough for a quick visual
# map of the namespace's shape; re-run any time the source changes.
set -euo pipefail

SRC_DIR="${1:-src/nemo_words}"
OUT_FILE="${2:-docs/nemo_words.dgml}"

if [ ! -d "$SRC_DIR" ]; then
  echo "error: source dir '$SRC_DIR' not found" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT_FILE")"

SRC_DIR="$SRC_DIR" OUT_FILE="$OUT_FILE" perl <<'PERL'
use strict;
use warnings;

my $src_dir  = $ENV{SRC_DIR};
my $out_file = $ENV{OUT_FILE};

sub esc {
    my ($s) = @_;
    $s =~ s/&/&amp;/g;
    $s =~ s/</&lt;/g;
    $s =~ s/>/&gt;/g;
    $s =~ s/"/&quot;/g;
    $s =~ s/'/&apos;/g;
    return $s;
}

my $SYM = qr/[A-Za-z0-9_\-!?*<>=.+]/;

opendir(my $dh, $src_dir) or die "can't open $src_dir: $!";
my @files = sort grep { /\.clj$/ } readdir($dh);
closedir($dh);
die "no .clj files found in $src_dir\n" unless @files;

my %node;          # qid -> { ns, name, category, form, start }
my %ns_order;       # ns -> [qid, ...] in source order
my %ns_requires;    # ns -> { alias => full-ns }
my %ns_seen;        # ns -> 1 (namespaces we actually parsed)
my %external;       # full-ns -> 1
my %edges;          # "src\ttgt" -> 1

for my $file (@files) {
    my $path = "$src_dir/$file";
    open(my $fh, '<', $path) or die "can't read $path: $!";
    local $/;
    my $content = <$fh>;
    close($fh);

    my ($ns) = $content =~ /\(ns\s+([A-Za-z0-9_.\-]+)/;
    $ns //= $file;
    $ns =~ s/\.clj$//;
    $ns_seen{$ns} = 1;
    $ns_order{$ns} ||= [];

    my %requires;
    while ($content =~ /\[\s*([A-Za-z0-9_.\-]+)\s+:as\s+([A-Za-z0-9_\-]+)\s*\]/g) {
        $requires{$2} = $1;
    }
    $ns_requires{$ns} = \%requires;

    my @defs; # { start, form, name }
    while ($content =~ /^\((defn-|defn|def)\s+(?:\^\S+\s+|\^\{[^}]*\}\s+)*([A-Za-z0-9_\-!?*<>=.+]+)/mg) {
        push @defs, { start => $-[0], form => $1, name => $2 };
    }
    next unless @defs;

    for my $i (0 .. $#defs) {
        my $d       = $defs[$i];
        my $start   = $d->{start};
        my $end     = ($i < $#defs) ? $defs[$i + 1]{start} : length($content);
        my $body    = substr($content, $start, $end - $start);
        my $qid     = "$ns/$d->{name}";
        my $private = ($d->{form} eq 'defn-') || ($body =~ /^\([\w-]+\s+\^:private\b/);
        my $category =
            $d->{name} eq '-main'    ? 'EntryPoint'  :
            $d->{form} =~ /^defn/    ? ($private ? 'PrivateFunction' : 'Function') :
                                        ($private ? 'PrivateData'     : 'Data');

        $node{$qid} = {
            ns => $ns, name => $d->{name}, category => $category,
            form => $d->{form}, body => $body,
        };
        push @{ $ns_order{$ns} }, $qid;
    }
}

# --- Edges -----------------------------------------------------------
for my $qid (keys %node) {
    my $n    = $node{$qid};
    my $ns   = $n->{ns};
    my $body = $n->{body};

    # same-namespace bare-symbol references
    for my $other_qid (@{ $ns_order{$ns} }) {
        next if $other_qid eq $qid;
        my $oname = $node{$other_qid}{name};
        my $q = quotemeta($oname);
        if ($body =~ /(?<!$SYM)$q(?!$SYM)/) {
            $edges{"$qid\t$other_qid"} = 1;
        }
    }

    # alias/symbol references (:require :as)
    my %requires = %{ $ns_requires{$ns} };
    while ($body =~ /([A-Za-z0-9_\-]+)\/([A-Za-z0-9_\-!?*<>=.+]+)/g) {
        my ($alias, $sym) = ($1, $2);
        next unless exists $requires{$alias};
        my $full_ns = $requires{$alias};
        if ($ns_seen{$full_ns}) {
            my $target_qid = "$full_ns/$sym";
            next if $target_qid eq $qid;
            if (exists $node{$target_qid}) {
                $edges{"$qid\t$target_qid"} = 1;
            } else {
                $edges{"$qid\t$full_ns"} = 1; # unresolved symbol in a sibling ns
            }
        } else {
            $external{$full_ns} = 1;
            $edges{"$qid\t$full_ns"} = 1;
        }
    }
}

# --- Emit DGML ---------------------------------------------------------
my $root_id = $src_dir;
my %cat_label = (
    Namespace       => '#4A4A4A',
    Group           => '#DDE8F0',
    Function        => '#A8D5A2',
    PrivateFunction => '#C9C9F0',
    Data            => '#F2E6A1',
    PrivateData     => '#E8DDA0',
    EntryPoint      => '#E06666',
    External        => '#BFBFBF',
);

my @out;
push @out, '<?xml version="1.0" encoding="utf-8"?>';
push @out, "<!-- Auto-generated by scripts/gen-dgml.sh from $src_dir. Do not hand-edit; re-run the script instead. -->";
push @out, '<DirectedGraph xmlns="http://schemas.microsoft.com/vs/2009/dgml">';
push @out, '  <Nodes>';
push @out, '    <Node Id="' . esc($root_id) . '" Label="' . esc($root_id) . '" Group="Expanded" Category="Namespace" />';
for my $ns (sort keys %ns_order) {
    push @out, '    <Node Id="' . esc("grp:$ns") . '" Label="' . esc($ns) . '" Group="Expanded" Category="Group" />';
}
if (%external) {
    push @out, '    <Node Id="grp:external" Label="External libs" Group="Expanded" Category="Group" />';
}
for my $ns (sort keys %ns_order) {
    for my $qid (@{ $ns_order{$ns} }) {
        my $n = $node{$qid};
        push @out, '    <Node Id="' . esc($qid) . '" Label="' . esc($n->{name})
                  . '" Comment="' . esc($n->{form}) . '" Category="' . esc($n->{category}) . '" />';
    }
}
for my $full_ns (sort keys %external) {
    push @out, '    <Node Id="' . esc($full_ns) . '" Label="' . esc($full_ns) . '" Category="External" />';
}
push @out, '  </Nodes>';

push @out, '  <Links>';
for my $ns (sort keys %ns_order) {
    push @out, '    <Link Source="' . esc($root_id) . '" Target="' . esc("grp:$ns") . '" Category="Contains" />';
    for my $qid (@{ $ns_order{$ns} }) {
        push @out, '    <Link Source="' . esc("grp:$ns") . '" Target="' . esc($qid) . '" Category="Contains" />';
    }
}
if (%external) {
    push @out, '    <Link Source="' . esc($root_id) . '" Target="grp:external" Category="Contains" />';
    for my $full_ns (sort keys %external) {
        push @out, '    <Link Source="grp:external" Target="' . esc($full_ns) . '" Category="Contains" />';
    }
}
for my $e (sort keys %edges) {
    my ($s, $t) = split /\t/, $e;
    push @out, '    <Link Source="' . esc($s) . '" Target="' . esc($t) . '" Category="Calls" />';
}
push @out, '  </Links>';

push @out, '  <Categories>';
for my $cat (sort keys %cat_label) {
    my $fg = ($cat eq 'Namespace' || $cat eq 'EntryPoint') ? ' Foreground="#FFFFFF"' : '';
    push @out, '    <Category Id="' . $cat . '" Background="' . $cat_label{$cat} . '"' . $fg . ' />';
}
push @out, '    <Category Id="Contains" IsContainment="True" />';
push @out, '    <Category Id="Calls" Label="calls" />';
push @out, '  </Categories>';

push @out, '  <Properties>';
push @out, '    <Property Id="Background" Label="Background" DataType="Brush" />';
push @out, '    <Property Id="Foreground" Label="Foreground" DataType="Brush" />';
push @out, '    <Property Id="Group" Label="Group" DataType="System.String" />';
push @out, '    <Property Id="IsContainment" DataType="System.Boolean" />';
push @out, '    <Property Id="Comment" Label="Comment" DataType="System.String" />';
push @out, '  </Properties>';
push @out, '</DirectedGraph>';

open(my $out, '>', $out_file) or die "can't write $out_file: $!";
print $out join("\n", @out), "\n";
close($out);

print "wrote $out_file (" . scalar(keys %node) . " nodes, " . scalar(keys %edges) . " call edges)\n";
PERL
