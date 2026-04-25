export const NETLIST_EXAMPLES = [
  {
    id: 'bjt-common-emitter',
    title: 'BJT Common-emitter amplifier',
    description: 'Single-stage CE amplifier with voltage-divider bias',
    tags: ['bjt', 'common-emitter', 'amplifier', 'biasing'],
    netlist: `* BJT Common-emitter amplifier
* [LAYOUT] R1 C=2 R=-2 ROT=90
* [LAYOUT] VAC1 C=0 R=0 ROT=90
* [LAYOUT] C1 C=1 R=-1 ROT=0
* [LAYOUT] R2 C=2 R=0 ROT=270
* [LAYOUT] R3 C=4 R=-2 ROT=90
* [LAYOUT] R4 C=4 R=0 ROT=90
* [LAYOUT] Q1 C=3 R=-1 ROT=0
* [LAYOUT] V1 C=3 R=-3 ROT=90
* [LAYOUT] C2 C=5 R=0 ROT=90
.MODEL IDEAL_NPN_Q1 NPN (IS=1e-14 BF=100 VAF=1000 VJE=0.7)
R1 1 2 20k
VAC1 0 3 SIN(0 1 1000)
C1 3 2 1uF
R2 0 2 3.6k
R3 1 4 1.2k
R4 5 0 220
Q1 4 2 5 IDEAL_NPN_Q1
V1 1 0 DC 12V
C2 5 0 1uF
.OP
.TRAN 20.0u 10.0m
.PRINT TRAN v(1) v(2) v(3) v(4) v(5) @R1[i] VAC1#branch @C1[i] @R2[i] @R3[i] @R4[i] @q1[ic] @q1[ib] V1#branch @C2[i]
.END`
  },
  {
    id: 'rc-low-pass',
    title: 'RC Low-pass filter',
    description: 'First-order passive low-pass filter excited by a sinusoidal source.',
    tags: ['rc', 'filter', 'low-pass', 'passive'],
    netlist: `* RC Low-pass filter
* [LAYOUT] VAC1 C=0 R=1 ROT=0
* [LAYOUT] R1 C=1 R=0 ROT=0
* [LAYOUT] C1 C=2 R=1 ROT=90
VAC1 0 1 SIN(0 5 1000)
R1 1 2 1k
C1 2 0 1uF
.OP
.TRAN 20.0u 10.0m
.PRINT TRAN v(1) v(2) VAC1#branch @R1[i] @C1[i]
.END`
  },
  {
    id: 'opamp-inverting',
    title: 'Op-amp inverting amplifier',
    description: 'Classic inverting op-amp stage with dual supply rails.',
    tags: ['opamp', 'inverting', 'amplifier', 'feedback'],
    netlist: `* Op-amp inverting amplifier
* [LAYOUT] VAC1 C=0 R=1 ROT=0
* [LAYOUT] R1 C=1 R=1 ROT=0
* [LAYOUT] XU1 C=2 R=1 ROT=0
* [LAYOUT] R2 C=2 R=0 ROT=0
* [LAYOUT] R3 C=3 R=2 ROT=90
.SUBCKT IDEAL_OPAMP_U1 inp inm out
Rin inp inm 10Meg
Egain out 0 inp inm 100000
.ENDS IDEAL_OPAMP_U1
XU1 1 0 2 IDEAL_OPAMP_U1
R1 3 1 10k
R2 1 2 100k
VAC1 0 3 SIN(0 5 1000)
R3 2 0 1k
.OP
.TRAN 20.0u 10.0m
.PRINT TRAN v(1) v(2) v(3) @R1[i] @R2[i] VAC1#branch @R3[i]
.END`
  },
  {
    id: 'diode-rectifier',
    title: 'Half-wave rectifier',
    description: 'Single-diode half-wave rectifier.',
    tags: ['diode', 'rectifier', 'power', 'ac-dc'],
    netlist: `* Half-wave rectifier
* [LAYOUT] VAC1 C=0 R=1 ROT=0
* [LAYOUT] D1 C=1 R=0 ROT=0
* [LAYOUT] R1 C=2 R=1 ROT=90
.MODEL IDEAL D (IS=1e-14 N=1 RS=0.001 BV=100 IBV=1e-10)
VAC1 0 1 SIN(0 5 1000)
D1 1 2 IDEAL
R1 2 0 1k
.OP
.TRAN 20.0u 10.0m
.PRINT TRAN v(1) v(2) VAC1#branch @d1[id] @R1[i]
.END`
  }
];
