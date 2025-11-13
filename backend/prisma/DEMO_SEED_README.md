# Demo Seed - Household Commitments Example

This demo seed script populates the database with a realistic example of conditional commitments based on a household scenario with Anna, Bella, Celia, and The Cat.

## The Scenario

Four housemates trying to coordinate household chores and rent payments through conditional commitments:

### Characters
- **Anna**: Likes loud AC/DC music, needs motivation to take out trash
- **Bella**: Willing to do dishes if rent situation is resolved
- **Celia**: Will pay rent if trash is handled, negotiates room size discount
- **The Cat**: Surprisingly responsible, pays rent and negotiates noise levels

### The Commitments

1. **Anna → Bella (Conditional)**
   - *"If Bella does the daily dishes, I'll take out the weekly trash"*
   - Condition: Bella does dishes at least 1 time per day
   - Promise: Anna takes out trash at least 1 time per week

2. **Bella → Celia (Conditional)**
   - *"I'll do the dishes twice a day if Celia pays 30% of the rent"*
   - Condition: Celia pays at least 30% of rent
   - Promise: Bella does dishes at least 2 times per day

3. **Celia → Others (Aggregate)**
   - *"I'll pay 30% of rent if the trash is taken out at least every two weeks"*
   - Condition: Others take out trash at least 1 time per 2 weeks (aggregate)
   - Promise: Celia pays 30% of rent

4. **The Cat (Unconditional)**
   - *"I'll pay those missing 10%"*
   - No condition - The Cat unconditionally commits to paying 10% of rent

5. **The Cat → Anna (Conditional with ratio)**
   - *"I'll reduce meowing by 1 dB for every 2 dB that Anna turns down AC/DC"*
   - Condition: Anna reduces AC/DC volume by at least 2 dB
   - Promise: The Cat reduces meowing by 1 dB

6. **Anna → The Cat (Conditional)**
   - *"I'll turn down AC/DC by 7 dB if The Cat reduces meowing"*
   - Condition: The Cat reduces meowing by at least 3.5 dB
   - Promise: Anna turns down AC/DC by 7 dB

## Expected Liability Calculation

When the liability calculator runs on these commitments, it should find a stable equilibrium where:

- **The Cat** pays 10% rent (unconditional)
- **Celia** is motivated to pay 30% rent because of trash commitment
- **Anna** takes out trash, enabling Celia's rent payment
- **Bella** does dishes because Celia pays rent
- A noise reduction agreement emerges between Anna and The Cat

This demonstrates:
- ✅ Unconditional commitments
- ✅ Single-user conditions
- ✅ Aggregate conditions
- ✅ Circular dependencies (Anna ↔ Bella ↔ Celia)
- ✅ Self-referential chains (Anna ↔ The Cat on noise)

## Running the Demo Seed

### Option 1: Using npm script (recommended)
```bash
cd backend
npm run prisma:demo-seed
```

### Option 2: Using the shell script
```bash
cd backend
./run-demo-seed.sh
```

### Option 3: Manual execution
```bash
cd backend
npx tsx prisma/demo-seed.ts
```

## Login Credentials

After seeding, you can log in as any of the characters:

- **Email:** anna@demo.com, **Password:** demo123
- **Email:** bella@demo.com, **Password:** demo123
- **Email:** celia@demo.com, **Password:** demo123
- **Email:** cat@demo.com, **Password:** demo123

## Testing the Example

1. Start the backend server: `npm run dev`
2. Start the frontend: `cd ../frontend && npm start`
3. Log in as any character
4. Navigate to the "Household Commitments" group
5. View the commitments in the Commitments tab
6. Check calculated liabilities in the Liabilities tab

## Notes

- This seed will add to existing data (not replace it)
- To reset the database completely, run `npm run prisma:reset` first
- The commitment structure demonstrates the fixed-point algorithm for liability calculation
- Some commitments have circular dependencies, which the algorithm resolves correctly
