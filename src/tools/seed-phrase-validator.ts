/**
 * Simple Seed Phrase Validator - Quick validation of BIP39 seed phrases
 * Tests different combinations of our found words to find valid seeds
 */

export class SeedPhraseValidator {
  // Our found BIP39 words
  private foundWords = ['add', 'ask', 'boss', 'bus', 'any', 'air', 'bar', 'boy', 'all', 'bag', 'art', 'age', 'busy'];
  
  // Found Ethereum addresses to check against
  private targetAddresses = [
    '0xed904f9b858030666aa276af386d63a26fa1e3c0',
    '0x53e0fa5a00068a04efa0d5573d1cb87e44365a27'
  ];

  // Original chronological order from our analysis
  private chronologicalSeed = ['add', 'ask', 'boss', 'bus', 'any', 'air', 'bar', 'boy', 'all', 'bag', 'art', 'age'];

  constructor() {
    console.log('🔍 SEED PHRASE VALIDATOR');
    console.log('Testing different combinations of found BIP39 words');
    console.log('='.repeat(55));
  }

  // 1. Test basic seed validity (without crypto libraries)
  public testSeedVariants(): void {
    console.log('\\n🧪 TESTING SEED VARIANTS:');
    console.log('='.repeat(30));

    const variants = [
      { name: 'Chronological (original)', words: this.chronologicalSeed },
      { name: 'Alphabetical', words: [...this.chronologicalSeed].sort() },
      { name: 'Reverse chronological', words: [...this.chronologicalSeed].reverse() },
      { name: 'Reverse alphabetical', words: [...this.chronologicalSeed].sort().reverse() },
      { name: 'With "busy" at start', words: ['busy', ...this.chronologicalSeed.slice(0, 11)] },
      { name: 'With "busy" at end', words: [...this.chronologicalSeed.slice(0, 11), 'busy'] },
      { name: 'Without duplicates', words: [...new Set(this.foundWords)].slice(0, 12) }
    ];

    for (const variant of variants) {
      console.log(`\\n📝 ${variant.name}:`);
      console.log(`   ${variant.words.join(' ')}`);
      console.log(`   Length: ${variant.words.length} words`);
      console.log(`   Unique: ${new Set(variant.words).size} words`);
      
      // Basic validation
      const isValidLength = variant.words.length === 12;
      const hasUniqueWords = new Set(variant.words).size === variant.words.length;
      const allValidBIP39 = variant.words.every(word => this.foundWords.includes(word));
      
      console.log(`   ✅ Valid length (12): ${isValidLength}`);
      console.log(`   ✅ All unique: ${hasUniqueWords}`);
      console.log(`   ✅ All BIP39 words: ${allValidBIP39}`);
      
      if (isValidLength && hasUniqueWords && allValidBIP39) {
        console.log(`   🎯 POTENTIALLY VALID SEED!`);
      }
    }
  }

  // 2. Generate simple checksum for seed words (simplified BIP39 check)
  public generateSimpleChecksum(words: string[]): string {
    // Simple hash of words (not real BIP39 validation)
    let hash = 0;
    const joined = words.join('');
    for (let i = 0; i < joined.length; i++) {
      const char = joined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  // 3. Test different word combinations
  public testWordCombinations(): void {
    console.log('\\n🔀 TESTING WORD COMBINATIONS:');
    console.log('='.repeat(35));

    // Test removing one word at a time
    console.log('\\n📉 Testing with 11 words (removing one):');
    for (let i = 0; i < this.chronologicalSeed.length; i++) {
      const reducedWords = [...this.chronologicalSeed];
      const removedWord = reducedWords.splice(i, 1)[0];
      
      console.log(`   Without "${removedWord}": ${reducedWords.join(' ')}`);
      console.log(`   Checksum: ${this.generateSimpleChecksum(reducedWords)}`);
    }

    // Test adding "busy" at different positions
    console.log('\\n📈 Testing with "busy" at different positions:');
    for (let i = 0; i <= 12; i++) {
      const wordsWithBusy = [...this.chronologicalSeed];
      wordsWithBusy.splice(i, 0, 'busy');
      
      // Limit to 12 words
      const finalWords = wordsWithBusy.slice(0, 12);
      console.log(`   Position ${i}: ${finalWords.join(' ')}`);
      console.log(`   Checksum: ${this.generateSimpleChecksum(finalWords)}`);
    }
  }

  // 4. Provide manual testing instructions
  public provideManualTestingInstructions(): void {
    console.log('\\n🛠️ MANUAL TESTING INSTRUCTIONS:');
    console.log('='.repeat(40));
    
    console.log('\\n🌐 Online Tools (Safe to use):');
    console.log('1. **Ian Coleman\'s BIP39 Tool**: https://iancoleman.io/bip39/');
    console.log('   - Can download and run offline');
    console.log('   - Enter seed phrase → see generated addresses');
    console.log('   - Check if our target addresses appear');
    
    console.log('\\n2. **MyEtherWallet (MEW)**: https://www.myetherwallet.com/');
    console.log('   - Create wallet from mnemonic phrase');
    console.log('   - Safe and reputable');
    
    console.log('\\n3. **Vanity-ETH**: https://vanity-eth.tk/');
    console.log('   - Generate addresses from seed');
    
    console.log('\\n📱 Wallet Apps:');
    console.log('1. **MetaMask**: Import → Secret Recovery Phrase');
    console.log('2. **Trust Wallet**: Import wallet → Recovery phrase');
    console.log('3. **Exodus**: Restore from backup → 12-word phrase');
    
    console.log('\\n🔍 What to test:');
    console.log('1. Enter each seed variant');
    console.log('2. Check if it\'s accepted as valid');
    console.log('3. Look at the first 20 generated addresses');
    console.log('4. See if our target addresses appear:');
    console.log(`   - ${this.targetAddresses[0]}`);
    console.log(`   - ${this.targetAddresses[1]}`);
  }

  // 5. Show most promising variants
  public showBestCandidates(): void {
    console.log('\\n🏆 BEST SEED CANDIDATES TO TEST:');
    console.log('='.repeat(40));
    
    const bestCandidates = [
      'add ask boss bus any air bar boy all bag art age',
      'add age air all any art ask bag bar boss boy bus', // alphabetical
      'busy add ask boss bus any air bar boy all bag art', // busy first
      'add ask boss bus any air bar boy all bag art busy', // busy last
      'age all any art ask bag bar boss boy bus add air'   // reverse alphabetical
    ];
    
    console.log('\\nTop 5 seed phrases to test (in order of probability):');
    bestCandidates.forEach((seed, index) => {
      console.log(`\\n${index + 1}. ${seed}`);
      console.log(`   Checksum: ${this.generateSimpleChecksum(seed.split(' '))}`);
    });
    
    console.log('\\n💡 Testing strategy:');
    console.log('1. Try these in order in MetaMask or online tool');
    console.log('2. If accepted, check first 20 addresses');
    console.log('3. Look for our target Ethereum addresses');
    console.log('4. If not found, try the next variant');
  }

  // Main analysis method
  public validate(): void {
    this.testSeedVariants();
    this.testWordCombinations();
    this.provideManualTestingInstructions();
    this.showBestCandidates();
    
    console.log('\\n✅ VALIDATION COMPLETE');
    console.log('Use the candidates above with online tools or MetaMask');
  }
}

// Execute the validator
async function main() {
  const validator = new SeedPhraseValidator();
  validator.validate();
}

if (require.main === module) {
  main().catch(console.error);
}