# US-040 route accuracy

Each labelled word put to Jev with judge-route's question; routed by p word-part: ≤ 0.3 general, ≥ 0.7 word-part, in between unsure. Card file: `anki/reading-room-terms.txt`.

- Labelled: 514 words
- Judged: 514 words
- Unjudged: 0 words (Jev errored or gave no usable answer; not counted below)
- Left out (both labels): 23 words

## Counts (0.3 / 0.7 cut-offs)

| Label | Judged | Routed right | Routed wrong | Unsure |
|---|---|---|---|---|
| general | 310 | 149 | 70 | 91 |
| word-part | 204 | 145 | 6 | 53 |

Of which the classifier calls ambiguous (the only words judge-route judges in the card pipeline): 18.

| Label | Judged | Routed right | Routed wrong | Unsure |
|---|---|---|---|---|
| general | 11 | 4 | 0 | 7 |
| word-part | 7 | 0 | 2 | 5 |

## Misrouted

| Word | Label | p word-part | Routed | Classifier |
|---|---|---|---|---|
| adherence | general | 0.82 | word-part | medical |
| adjudicated | general | 0.81 | word-part | no match |
| adverse | general | 0.73 | word-part | no match |
| affinity | general | 0.75 | word-part | no match |
| anomaly | general | 0.8 | word-part | no match |
| anticipate | general | 0.72 | word-part | medical |
| apparatus | general | 0.75 | word-part | no match |
| attest | general | 0.7 | word-part | no match |
| automobile | general | 0.74 | word-part | no match |
| bibliography | general | 0.87 | word-part | medical |
| causality | general | 0.75 | word-part | no match |
| certify | general | 0.77 | word-part | no match |
| circulation | general | 0.77 | word-part | no match |
| combustion | general | 0.79 | word-part | no match |
| compete | general | 0.72 | word-part | no match |
| competence | general | 0.76 | word-part | no match |
| compliance | general | 0.79 | word-part | no match |
| component | general | 0.74 | word-part | no match |
| congenital | general | 0.87 | word-part | no match |
| critique | general | 0.72 | word-part | no match |
| curriculum | general | 0.73 | word-part | no match |
| dangerous | word-part | 0.18 | general | ambiguous |
| descendant | general | 0.76 | word-part | no match |
| discrete | general | 0.76 | word-part | no match |
| eligibility | general | 0.76 | word-part | no match |
| eligible | general | 0.73 | word-part | no match |
| embellishment | general | 0.74 | word-part | no match |
| evaporate | general | 0.79 | word-part | no match |
| fidelity | general | 0.72 | word-part | no match |
| formation | general | 0.75 | word-part | no match |
| hypernym | general | 0.83 | word-part | medical |
| indispensable | general | 0.78 | word-part | no match |
| induce | general | 0.83 | word-part | no match |
| inducing | general | 0.75 | word-part | no match |
| inert | general | 0.74 | word-part | no match |
| inflate | general | 0.81 | word-part | no match |
| inhibitor | general | 0.85 | word-part | no match |
| innate | general | 0.73 | word-part | no match |
| inscription | general | 0.73 | word-part | no match |
| intervention | general | 0.8 | word-part | medical |
| invigilator | general | 0.77 | word-part | no match |
| legible | general | 0.75 | word-part | no match |
| legitimate | general | 0.74 | word-part | no match |
| literal | general | 0.76 | word-part | no match |
| malformed | general | 0.81 | word-part | medical |
| malignant | general | 0.84 | word-part | medical |
| mediated | general | 0.78 | word-part | no match |
| moderate | general | 0.71 | word-part | no match |
| negate | general | 0.81 | word-part | no match |
| nervous | word-part | 0.22 | general | ambiguous |
| occupy | general | 0.74 | word-part | no match |
| optimal | general | 0.83 | word-part | no match |
| paucity | general | 0.77 | word-part | no match |
| phobic | general | 0.85 | word-part | no match |
| picture | word-part | 0.13 | general | no match |
| polymerize | general | 0.87 | word-part | medical |
| polysemy | general | 0.85 | word-part | medical |
| prologue | general | 0.84 | word-part | no match |
| promise | word-part | 0.13 | general | no match |
| recurrent | general | 0.8 | word-part | medical |
| regulation | general | 0.76 | word-part | no match |
| relapse | general | 0.76 | word-part | no match |
| remediation | general | 0.84 | word-part | no match |
| remission | general | 0.81 | word-part | no match |
| return | word-part | 0.19 | general | no match |
| saturation | general | 0.78 | word-part | no match |
| stimulate | general | 0.8 | word-part | no match |
| substance | general | 0.71 | word-part | medical |
| susceptible | general | 0.79 | word-part | no match |
| synonym | general | 0.82 | word-part | medical |
| tessellated | general | 0.8 | word-part | no match |
| transplants | general | 0.74 | word-part | medical |
| undeniable | general | 0.7 | word-part | no match |
| value | word-part | 0.29 | general | no match |
| ventilator | general | 0.71 | word-part | no match |
| vigilance | general | 0.71 | word-part | no match |

## Unjudged

| Word | Label | Cause |
|---|---|---|

## Left out (both labels)

- adjacent
- adjoining
- allogeneic
- anaemia
- apheresis
- autologous
- colitis
- haemoglobin
- hydrophobic
- infusion
- lobotomy
- lymphoma
- malignancy
- myeloma
- phlebotomy
- plasma
- pneumonitis
- premise
- prevalence
- steroid
- tacrolimus
- thalassaemia
- translucent

## Every judged word

| Word | Label | p word-part | Routed | Classifier |
|---|---|---|---|---|
| accuracy | word-part | 0.67 | unsure | no match |
| acid | word-part | 0.49 | unsure | no match |
| acidic | word-part | 0.63 | unsure | no match |
| acquiesce | word-part | 0.75 | word-part | no match |
| acquired | general | 0.66 | unsure | no match |
| adenoid | word-part | 0.79 | word-part | medical |
| adhere | word-part | 0.76 | word-part | no match |
| adherence | general | 0.82 | word-part | medical |
| adjudicated | general | 0.81 | word-part | no match |
| adrenocortical | word-part | 0.87 | word-part | medical |
| adverse | general | 0.73 | word-part | no match |
| affinity | general | 0.75 | word-part | no match |
| agog | general | 0.33 | unsure | no match |
| aisle | general | 0.09 | general | no match |
| allergy | word-part | 0.64 | unsure | no match |
| allopathic | word-part | 0.88 | word-part | medical |
| aloe | general | 0.18 | general | no match |
| amenorrhea | word-part | 0.87 | word-part | medical |
| anabolism | word-part | 0.9 | word-part | no match |
| analogous | word-part | 0.54 | unsure | ambiguous |
| anaphylaxis | word-part | 0.87 | word-part | no match |
| anatomy | word-part | 0.79 | word-part | no match |
| ancestor | general | 0.56 | unsure | no match |
| anemia | word-part | 0.79 | word-part | medical |
| anesthesia | word-part | 0.83 | word-part | no match |
| anomaly | general | 0.8 | word-part | no match |
| anoxia | word-part | 0.85 | word-part | no match |
| anticipate | general | 0.72 | word-part | medical |
| apoptosis | word-part | 0.87 | word-part | medical |
| apparatus | general | 0.75 | word-part | no match |
| apparently | general | 0.28 | general | medical |
| appeal | general | 0.22 | general | ambiguous |
| apprenticeship | general | 0.18 | general | medical |
| appropriate | general | 0.67 | unsure | no match |
| arthritis | word-part | 0.82 | word-part | medical |
| astronomy | word-part | 0.88 | word-part | no match |
| ataxia | word-part | 0.85 | word-part | no match |
| attest | general | 0.7 | word-part | no match |
| autoimmune | word-part | 0.82 | word-part | medical |
| automobile | general | 0.74 | word-part | no match |
| autonomous | word-part | 0.56 | unsure | ambiguous |
| autopsy | word-part | 0.8 | word-part | no match |
| barometer | word-part | 0.74 | word-part | no match |
| beat | general | 0.09 | general | no match |
| biases | general | 0.55 | unsure | no match |
| bibliography | general | 0.87 | word-part | medical |
| biochemistry | word-part | 0.89 | word-part | medical |
| biology | word-part | 0.87 | word-part | medical |
| breached | general | 0.19 | general | no match |
| breadth | general | 0.22 | general | no match |
| brisk | general | 0.1 | general | no match |
| bulge | general | 0.11 | general | no match |
| carcinoma | word-part | 0.84 | word-part | medical |
| cardiology | word-part | 0.86 | word-part | medical |
| causality | general | 0.75 | word-part | no match |
| caveat | general | 0.58 | unsure | no match |
| certify | general | 0.77 | word-part | no match |
| characteristic | word-part | 0.45 | unsure | ambiguous |
| chemistry | word-part | 0.71 | word-part | medical |
| chemotherapy | word-part | 0.83 | word-part | medical |
| cholesterol | word-part | 0.68 | unsure | no match |
| circuitry | general | 0.26 | general | no match |
| circulation | general | 0.77 | word-part | no match |
| circulatory | word-part | 0.75 | word-part | no match |
| claustrophobia | word-part | 0.85 | word-part | medical |
| clock | general | 0.09 | general | no match |
| clog | general | 0.09 | general | no match |
| coalesce | word-part | 0.84 | word-part | no match |
| coarse | general | 0.13 | general | no match |
| coaster | general | 0.13 | general | no match |
| cobblestone | general | 0.08 | general | no match |
| cocked | general | 0.07 | general | no match |
| coda | general | 0.36 | unsure | no match |
| cohort | general | 0.68 | unsure | no match |
| colon | general | 0.51 | unsure | medical |
| colonoscopy | word-part | 0.84 | word-part | medical |
| colostomy | word-part | 0.81 | word-part | medical |
| coma | word-part | 0.34 | unsure | medical |
| combustion | general | 0.79 | word-part | no match |
| comical | word-part | 0.42 | unsure | no match |
| comorbidity | word-part | 0.86 | word-part | no match |
| compete | general | 0.72 | word-part | no match |
| competence | general | 0.76 | word-part | no match |
| compliance | general | 0.79 | word-part | no match |
| component | general | 0.74 | word-part | no match |
| compromise | word-part | 0.58 | unsure | no match |
| concocted | general | 0.61 | unsure | medical |
| conduct | word-part | 0.58 | unsure | no match |
| conducting | general | 0.57 | unsure | no match |
| confidence | word-part | 0.55 | unsure | no match |
| confound | general | 0.51 | unsure | no match |
| congenital | general | 0.87 | word-part | no match |
| congregate | word-part | 0.83 | word-part | no match |
| connect | word-part | 0.48 | unsure | no match |
| consensus | word-part | 0.82 | word-part | no match |
| contain | word-part | 0.43 | unsure | no match |
| contest | general | 0.36 | unsure | no match |
| convalesce | word-part | 0.82 | word-part | no match |
| coordinate | general | 0.68 | unsure | no match |
| corncob | general | 0.07 | general | no match |
| corpus | general | 0.64 | unsure | no match |
| cortical | word-part | 0.8 | word-part | no match |
| corticosteroid | word-part | 0.86 | word-part | medical |
| cottage | general | 0.08 | general | no match |
| cracks | general | 0.09 | general | no match |
| cramped | general | 0.17 | general | no match |
| creak | general | 0.06 | general | no match |
| crest | general | 0.2 | general | no match |
| critique | general | 0.72 | word-part | no match |
| cryptic | general | 0.34 | unsure | ambiguous |
| curl | general | 0.1 | general | no match |
| curriculum | general | 0.73 | word-part | no match |
| cytokine | word-part | 0.81 | word-part | medical |
| cytoplasm | word-part | 0.88 | word-part | medical |
| cytotoxic | word-part | 0.87 | word-part | medical |
| dangerous | word-part | 0.18 | general | ambiguous |
| deactivate | word-part | 0.68 | unsure | no match |
| deceive | word-part | 0.42 | unsure | no match |
| decent | general | 0.37 | unsure | no match |
| decompose | word-part | 0.85 | word-part | no match |
| defect | general | 0.62 | unsure | no match |
| demise | word-part | 0.51 | unsure | no match |
| democracy | word-part | 0.88 | word-part | no match |
| depict | word-part | 0.67 | unsure | no match |
| depicted | general | 0.6 | unsure | no match |
| descendant | general | 0.76 | word-part | no match |
| devastating | general | 0.53 | unsure | no match |
| devious | general | 0.24 | general | ambiguous |
| diaeresis | word-part | 0.83 | word-part | medical |
| diagnosis | word-part | 0.85 | word-part | medical |
| dialysis | word-part | 0.76 | word-part | medical |
| diameter | word-part | 0.88 | word-part | medical |
| diarrhea | word-part | 0.71 | word-part | medical |
| diffusion | word-part | 0.74 | word-part | no match |
| disciplinary | general | 0.38 | unsure | ambiguous |
| discrete | general | 0.76 | word-part | no match |
| dismiss | general | 0.64 | unsure | no match |
| dismissal | general | 0.65 | unsure | no match |
| diuresis | word-part | 0.88 | word-part | no match |
| donor | general | 0.69 | unsure | no match |
| dormant | general | 0.61 | unsure | no match |
| dose | general | 0.25 | general | no match |
| dozen | general | 0.1 | general | no match |
| drain | general | 0.12 | general | no match |
| droplet | general | 0.18 | general | no match |
| drown | general | 0.08 | general | no match |
| durable | general | 0.66 | unsure | no match |
| economy | word-part | 0.65 | unsure | no match |
| effervesce | word-part | 0.82 | word-part | no match |
| elastic | general | 0.33 | unsure | ambiguous |
| eligibility | general | 0.76 | word-part | no match |
| eligible | general | 0.73 | word-part | no match |
| embellishment | general | 0.74 | word-part | no match |
| emboldened | general | 0.57 | unsure | no match |
| engine | general | 0.15 | general | no match |
| episode | general | 0.67 | unsure | medical |
| era | general | 0.26 | general | no match |
| escalation | general | 0.61 | unsure | no match |
| essence | general | 0.68 | unsure | no match |
| essential | general | 0.65 | unsure | no match |
| etched | general | 0.17 | general | no match |
| eureka | word-part | 0.46 | unsure | no match |
| evaporate | general | 0.79 | word-part | no match |
| everolimus | word-part | 0.64 | unsure | medical |
| evicted | general | 0.45 | unsure | no match |
| excelling | general | 0.4 | unsure | no match |
| existence | word-part | 0.68 | unsure | no match |
| exotic | general | 0.35 | unsure | medical |
| extraneous | general | 0.55 | unsure | ambiguous |
| faint | general | 0.16 | general | no match |
| faintly | general | 0.24 | general | no match |
| fibrin | word-part | 0.65 | unsure | no match |
| fidelity | general | 0.72 | word-part | no match |
| fleet | general | 0.16 | general | no match |
| flinching | general | 0.14 | general | no match |
| flustered | general | 0.12 | general | no match |
| flux | general | 0.62 | unsure | no match |
| foam | general | 0.11 | general | no match |
| formation | general | 0.75 | word-part | no match |
| fracture | word-part | 0.64 | unsure | no match |
| fragment | word-part | 0.75 | word-part | no match |
| garage | general | 0.11 | general | no match |
| genesis | word-part | 0.79 | word-part | no match |
| germane | general | 0.46 | unsure | no match |
| globulin | word-part | 0.84 | word-part | no match |
| gnarly | general | 0.08 | general | no match |
| granular | general | 0.6 | unsure | no match |
| hedge | general | 0.09 | general | no match |
| hematology | word-part | 0.88 | word-part | medical |
| hematoma | word-part | 0.85 | word-part | medical |
| hematuria | word-part | 0.88 | word-part | medical |
| hemolysis | word-part | 0.89 | word-part | medical |
| hepatitis | word-part | 0.82 | word-part | medical |
| hepatology | word-part | 0.87 | word-part | medical |
| hepatomegaly | word-part | 0.9 | word-part | medical |
| herd | general | 0.08 | general | no match |
| heterodox | word-part | 0.87 | word-part | medical |
| heterogeneous | word-part | 0.82 | word-part | medical |
| heterozygous | word-part | 0.85 | word-part | medical |
| heuristic | word-part | 0.62 | unsure | ambiguous |
| hippodrome | word-part | 0.86 | word-part | no match |
| homogeneous | word-part | 0.7 | word-part | medical |
| homologous | word-part | 0.63 | unsure | medical |
| homozygous | word-part | 0.84 | word-part | medical |
| hose | general | 0.09 | general | no match |
| huff | general | 0.07 | general | no match |
| hum | general | 0.08 | general | no match |
| hydrant | general | 0.62 | unsure | no match |
| hydrology | word-part | 0.88 | word-part | medical |
| hydrophilic | word-part | 0.91 | word-part | no match |
| hypernym | general | 0.83 | word-part | medical |
| hypothermia | word-part | 0.86 | word-part | medical |
| ibuprofen | word-part | 0.73 | word-part | no match |
| idiosyncratic | general | 0.64 | unsure | ambiguous |
| idling | general | 0.12 | general | no match |
| implied | general | 0.63 | unsure | no match |
| incident | general | 0.63 | unsure | medical |
| indispensable | general | 0.78 | word-part | no match |
| induce | general | 0.83 | word-part | no match |
| inducing | general | 0.75 | word-part | no match |
| inert | general | 0.74 | word-part | no match |
| inflate | general | 0.81 | word-part | no match |
| inhibitor | general | 0.85 | word-part | no match |
| innate | general | 0.73 | word-part | no match |
| inpatient | general | 0.26 | general | no match |
| inscription | general | 0.73 | word-part | no match |
| insulin | word-part | 0.6 | unsure | no match |
| interplay | general | 0.54 | unsure | medical |
| intervention | general | 0.8 | word-part | medical |
| intestine | general | 0.68 | unsure | no match |
| intracranial | word-part | 0.9 | word-part | medical |
| intramural | word-part | 0.87 | word-part | medical |
| intramuscular | word-part | 0.89 | word-part | medical |
| intravenous | word-part | 0.67 | unsure | medical |
| invigilator | general | 0.77 | word-part | no match |
| inward | general | 0.13 | general | no match |
| jerk | general | 0.09 | general | no match |
| journeyman | general | 0.08 | general | no match |
| ketoprofen | word-part | 0.8 | word-part | no match |
| kinesis | word-part | 0.85 | word-part | no match |
| kinetic | word-part | 0.65 | unsure | ambiguous |
| ladles | general | 0.1 | general | no match |
| lass | general | 0.08 | general | no match |
| latch | general | 0.08 | general | no match |
| least | general | 0.08 | general | no match |
| legible | general | 0.75 | word-part | no match |
| legitimate | general | 0.74 | word-part | no match |
| leukocyte | word-part | 0.9 | word-part | medical |
| levee | general | 0.14 | general | no match |
| liability | general | 0.62 | unsure | no match |
| limb | general | 0.12 | general | no match |
| linguistic | word-part | 0.5 | unsure | medical |
| literal | general | 0.76 | word-part | no match |
| literature | general | 0.6 | unsure | no match |
| loam | general | 0.08 | general | no match |
| lobe | general | 0.43 | unsure | no match |
| lobectomy | word-part | 0.86 | word-part | medical |
| lump | general | 0.08 | general | no match |
| lymph | general | 0.48 | unsure | medical |
| lymphatic | word-part | 0.5 | unsure | medical |
| lymphocyte | word-part | 0.84 | word-part | medical |
| maintain | word-part | 0.59 | unsure | no match |
| malformed | general | 0.81 | word-part | medical |
| malignant | general | 0.84 | word-part | medical |
| manual | word-part | 0.45 | unsure | no match |
| manufacture | word-part | 0.56 | unsure | no match |
| marrow | general | 0.13 | general | no match |
| mechanic | general | 0.49 | unsure | no match |
| mediated | general | 0.78 | word-part | no match |
| merely | general | 0.23 | general | no match |
| moderate | general | 0.71 | word-part | no match |
| morbid | word-part | 0.75 | word-part | no match |
| morbidity | word-part | 0.81 | word-part | no match |
| mortal | word-part | 0.7 | word-part | no match |
| mortality | word-part | 0.79 | word-part | no match |
| mote | general | 0.12 | general | no match |
| myelogenous | word-part | 0.73 | word-part | medical |
| myeloid | word-part | 0.83 | word-part | medical |
| naproxen | word-part | 0.74 | word-part | no match |
| natal | word-part | 0.69 | unsure | no match |
| nay | general | 0.09 | general | no match |
| negate | general | 0.81 | word-part | no match |
| neoplasm | word-part | 0.87 | word-part | medical |
| nervous | word-part | 0.22 | general | ambiguous |
| neutropenia | word-part | 0.89 | word-part | medical |
| neutrophil | word-part | 0.88 | word-part | no match |
| norovirus | word-part | 0.37 | unsure | no match |
| obsolesce | word-part | 0.79 | word-part | no match |
| obtained | general | 0.54 | unsure | no match |
| occupy | general | 0.74 | word-part | no match |
| odd | general | 0.09 | general | no match |
| ominous | general | 0.26 | general | ambiguous |
| oncogene | word-part | 0.82 | word-part | medical |
| oncogenic | word-part | 0.86 | word-part | medical |
| oncology | word-part | 0.85 | word-part | medical |
| onset | general | 0.31 | unsure | no match |
| onwards | general | 0.11 | general | no match |
| optimal | general | 0.83 | word-part | no match |
| ornament | general | 0.64 | unsure | no match |
| osteopenia | word-part | 0.88 | word-part | medical |
| overgrown | general | 0.2 | general | no match |
| overreach | general | 0.2 | general | no match |
| pail | general | 0.07 | general | no match |
| pajamas | general | 0.08 | general | no match |
| pale | general | 0.17 | general | no match |
| paradox | word-part | 0.76 | word-part | medical |
| paramedic | word-part | 0.61 | unsure | medical |
| parameter | word-part | 0.77 | word-part | medical |
| parch | general | 0.13 | general | no match |
| parchment | general | 0.27 | general | no match |
| pate | general | 0.17 | general | no match |
| pathway | general | 0.19 | general | medical |
| patrons | general | 0.56 | unsure | no match |
| pattern | general | 0.23 | general | no match |
| paucity | general | 0.77 | word-part | no match |
| peculiar | general | 0.48 | unsure | no match |
| pedagogical | word-part | 0.84 | word-part | no match |
| pedagogy | word-part | 0.87 | word-part | no match |
| pediatric | word-part | 0.83 | word-part | no match |
| pediatrician | word-part | 0.82 | word-part | medical |
| penalty | general | 0.58 | unsure | no match |
| perceive | word-part | 0.83 | word-part | no match |
| perforate | word-part | 0.87 | word-part | no match |
| period | general | 0.57 | unsure | medical |
| permeate | word-part | 0.79 | word-part | no match |
| pertain | word-part | 0.55 | unsure | no match |
| pharmacokinetics | word-part | 0.88 | word-part | no match |
| pharmacology | word-part | 0.83 | word-part | medical |
| pharmacovigilance | word-part | 0.82 | word-part | no match |
| phlebitis | word-part | 0.86 | word-part | medical |
| phobic | general | 0.85 | word-part | no match |
| physiotherapy | word-part | 0.86 | word-part | no match |
| pictorial | word-part | 0.69 | unsure | no match |
| picture | word-part | 0.13 | general | no match |
| plateau | general | 0.19 | general | no match |
| platelet | general | 0.52 | unsure | no match |
| plausible | general | 0.68 | unsure | no match |
| plausibly | general | 0.47 | unsure | no match |
| plumbing | general | 0.25 | general | no match |
| pneumonectomy | word-part | 0.9 | word-part | medical |
| pneumonia | word-part | 0.82 | word-part | medical |
| polymerize | general | 0.87 | word-part | medical |
| polysemy | general | 0.85 | word-part | medical |
| portrait | general | 0.36 | unsure | no match |
| postmortem | word-part | 0.86 | word-part | no match |
| pound | general | 0.08 | general | no match |
| preconceive | word-part | 0.73 | word-part | medical |
| predict | word-part | 0.69 | unsure | medical |
| prevent | word-part | 0.72 | word-part | medical |
| privacy | word-part | 0.57 | unsure | no match |
| prologue | general | 0.84 | word-part | no match |
| promise | word-part | 0.13 | general | no match |
| protoplasm | word-part | 0.87 | word-part | no match |
| pursuing | general | 0.48 | unsure | no match |
| quebec | general | 0.09 | general | no match |
| rack | general | 0.07 | general | no match |
| radiotherapy | word-part | 0.77 | word-part | no match |
| rationing | general | 0.4 | unsure | no match |
| rattles | general | 0.08 | general | no match |
| realms | general | 0.32 | unsure | no match |
| reassuring | general | 0.28 | general | no match |
| receive | word-part | 0.5 | unsure | no match |
| recur | word-part | 0.72 | word-part | no match |
| recurrent | general | 0.8 | word-part | medical |
| refractory | word-part | 0.81 | word-part | no match |
| regime | general | 0.68 | unsure | no match |
| regional | general | 0.61 | unsure | no match |
| regulation | general | 0.76 | word-part | no match |
| relapse | general | 0.76 | word-part | no match |
| relief | general | 0.44 | unsure | no match |
| remediation | general | 0.84 | word-part | no match |
| remission | general | 0.81 | word-part | no match |
| residue | general | 0.69 | unsure | no match |
| respiratory | word-part | 0.69 | unsure | no match |
| restraint | general | 0.66 | unsure | no match |
| retain | word-part | 0.7 | word-part | no match |
| return | word-part | 0.19 | general | no match |
| rev | general | 0.2 | general | no match |
| revised | general | 0.6 | unsure | no match |
| rhinorrhea | word-part | 0.9 | word-part | medical |
| ridge | general | 0.1 | general | no match |
| rigged | general | 0.1 | general | no match |
| rigid | word-part | 0.66 | unsure | no match |
| robe | general | 0.11 | general | no match |
| roster | general | 0.18 | general | medical |
| ruffled | general | 0.13 | general | no match |
| runes | general | 0.1 | general | no match |
| rung | general | 0.07 | general | no match |
| sarcoid | word-part | 0.72 | word-part | no match |
| sarcoma | word-part | 0.8 | word-part | medical |
| saturation | general | 0.78 | word-part | no match |
| savory | general | 0.16 | general | no match |
| scalpel | general | 0.66 | unsure | no match |
| scarce | general | 0.18 | general | no match |
| scatter | general | 0.1 | general | no match |
| severe | general | 0.4 | unsure | no match |
| shattered | general | 0.12 | general | no match |
| shuttered | general | 0.11 | general | no match |
| sickle | general | 0.13 | general | no match |
| signpost | general | 0.08 | general | no match |
| simmers | general | 0.11 | general | no match |
| sirolimus | word-part | 0.57 | unsure | medical |
| slate | general | 0.12 | general | no match |
| slates | general | 0.12 | general | no match |
| snubbing | general | 0.11 | general | no match |
| spare | general | 0.09 | general | no match |
| sparrow | general | 0.09 | general | no match |
| speedometer | word-part | 0.41 | unsure | no match |
| spilled | general | 0.08 | general | no match |
| spiraling | general | 0.4 | unsure | no match |
| spontaneous | general | 0.55 | unsure | ambiguous |
| squat | general | 0.09 | general | no match |
| stack | general | 0.09 | general | no match |
| stamina | general | 0.52 | unsure | no match |
| stampede | general | 0.1 | general | no match |
| stance | general | 0.39 | unsure | no match |
| steelman | general | 0.1 | general | no match |
| steep | general | 0.1 | general | no match |
| steer | general | 0.08 | general | no match |
| sterol | word-part | 0.77 | word-part | no match |
| stew | general | 0.08 | general | no match |
| steward | general | 0.14 | general | no match |
| stiff | general | 0.11 | general | no match |
| stigma | word-part | 0.72 | word-part | no match |
| stimulate | general | 0.8 | word-part | no match |
| sting | general | 0.09 | general | no match |
| stool | general | 0.1 | general | no match |
| stools | general | 0.12 | general | no match |
| stray | general | 0.1 | general | no match |
| streak | general | 0.1 | general | no match |
| strive | general | 0.13 | general | no match |
| strutted | general | 0.11 | general | no match |
| studio | general | 0.23 | general | no match |
| subcutaneous | word-part | 0.75 | word-part | medical |
| submit | word-part | 0.47 | unsure | medical |
| substance | general | 0.71 | word-part | medical |
| summoning | general | 0.28 | general | no match |
| surgeon | general | 0.63 | unsure | no match |
| susceptible | general | 0.79 | word-part | no match |
| suspiciously | general | 0.41 | unsure | no match |
| sustain | word-part | 0.72 | word-part | no match |
| sweating | general | 0.13 | general | no match |
| sweep | general | 0.09 | general | no match |
| swell | general | 0.1 | general | no match |
| swollen | general | 0.16 | general | no match |
| symptom | word-part | 0.81 | word-part | medical |
| syndrome | word-part | 0.83 | word-part | medical |
| syngeneic | word-part | 0.89 | word-part | medical |
| synonym | general | 0.82 | word-part | medical |
| synthesis | word-part | 0.84 | word-part | medical |
| tacit | general | 0.56 | unsure | no match |
| tackle | general | 0.09 | general | no match |
| tavern | general | 0.16 | general | no match |
| taxidermy | word-part | 0.71 | word-part | medical |
| taxonomy | word-part | 0.85 | word-part | no match |
| tertiary | general | 0.4 | unsure | ambiguous |
| tessellated | general | 0.8 | word-part | no match |
| theoretical | general | 0.67 | unsure | no match |
| thermometer | word-part | 0.85 | word-part | medical |
| thrombocytopenia | word-part | 0.9 | word-part | medical |
| throne | general | 0.13 | general | no match |
| thyroid | word-part | 0.75 | word-part | medical |
| thyroiditis | word-part | 0.86 | word-part | medical |
| thyroxine | word-part | 0.73 | word-part | no match |
| timber | general | 0.1 | general | no match |
| tingle | general | 0.09 | general | no match |
| toss | general | 0.07 | general | no match |
| toxic | word-part | 0.73 | word-part | no match |
| toxicology | word-part | 0.84 | word-part | medical |
| toxin | word-part | 0.81 | word-part | no match |
| tracheotomy | word-part | 0.89 | word-part | medical |
| trades | general | 0.1 | general | no match |
| trail | general | 0.1 | general | no match |
| trait | general | 0.49 | unsure | no match |
| transfusion | word-part | 0.81 | word-part | medical |
| transplant | word-part | 0.75 | word-part | medical |
| transplants | general | 0.74 | word-part | medical |
| trauma | word-part | 0.71 | word-part | no match |
| triage | general | 0.32 | unsure | medical |
| trial | general | 0.3 | general | medical |
| trinity | word-part | 0.67 | unsure | medical |
| trivial | general | 0.57 | unsure | medical |
| tumor | general | 0.58 | unsure | no match |
| ultimately | general | 0.69 | unsure | no match |
| unbidden | general | 0.59 | unsure | no match |
| undeniable | general | 0.7 | word-part | no match |
| undergone | general | 0.59 | unsure | no match |
| unwinding | general | 0.15 | general | no match |
| urgency | word-part | 0.57 | unsure | no match |
| vain | general | 0.34 | unsure | no match |
| valid | word-part | 0.7 | word-part | no match |
| value | word-part | 0.29 | general | no match |
| vapid | general | 0.49 | unsure | no match |
| vapor | general | 0.48 | unsure | no match |
| veil | general | 0.12 | general | no match |
| vein | general | 0.22 | general | no match |
| ventilator | general | 0.71 | word-part | no match |
| vigilance | general | 0.71 | word-part | no match |
| vigilant | word-part | 0.65 | unsure | no match |
| viral | word-part | 0.55 | unsure | no match |
| virology | word-part | 0.86 | word-part | medical |
| virus | word-part | 0.41 | unsure | no match |
| wail | general | 0.1 | general | no match |
| warrant | general | 0.2 | general | no match |
| wary | general | 0.11 | general | ambiguous |
| weathered | general | 0.2 | general | no match |
| weave | general | 0.08 | general | no match |
| winding | general | 0.12 | general | no match |
| wore | general | 0.06 | general | no match |
| worn | general | 0.09 | general | no match |
| wrecked | general | 0.08 | general | no match |
| wrung | general | 0.06 | general | no match |
| xenogeneic | word-part | 0.88 | word-part | no match |
| xenophobia | word-part | 0.89 | word-part | medical |

## Cut-offs

Rule: over all 514 judged words, a wrong route costs 2 and an unsure one 1; every lower / upper pair on a 0.05 grid (lower 0.05–0.5, upper 0.5–0.95) is scored, and 0.3 / 0.7 hold when none scores lower.

| Cut-offs | Routed wrong | Unsure | Cost |
|---|---|---|---|
| 0.3 / 0.7 | 76 | 144 | 296 |
| 0.4 / 0.8 | 32 | 210 | 274 |

**Conclusion:** the 0.3 / 0.7 cut-offs don't hold; the results support 0.4 / 0.8 instead (cost 274 against 296).
