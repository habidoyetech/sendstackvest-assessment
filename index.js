const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Endpoint to handle POST requests to /split-payments/compute
app.post('/split-payments/compute', (req, res) => {
  const { ID, Amount, Currency, CustomerEmail, SplitInfo } = req.body;

  // Sort SplitInfo based on precedence (FLAT, PERCENTAGE, RATIO)
  const sortedSplitInfo = SplitInfo.sort((a, b) => {
    const precedenceOrder = { FLAT: 1, PERCENTAGE: 2, RATIO: 3 };
    return precedenceOrder[a.SplitType] - precedenceOrder[b.SplitType];
  });

  console.log(sortedSplitInfo)

  let balance = Amount;
  const splitBreakdown = [];
  let totalInstanceOfRatio = sortedSplitInfo.filter(entity => entity.SplitType === 'RATIO').length
  let openingRatioBalance = 0
  console.log(totalInstanceOfRatio)

  for (const splitEntity of sortedSplitInfo) {
    let splitAmount = 0;

    

    switch (splitEntity.SplitType) {
      case 'FLAT':
        splitAmount = splitEntity.SplitValue;
        break;
      case 'PERCENTAGE':
        splitAmount = (splitEntity.SplitValue / 100) * balance;

        break;
      case 'RATIO':
        if (totalInstanceOfRatio === sortedSplitInfo.filter(entity => entity.SplitType === 'RATIO').length) {openingRatioBalance = balance}
        // Calculate split based on ratio and total ratio
        const totalRatio = sortedSplitInfo
          .filter(entity => entity.SplitType === 'RATIO')
          .reduce((total, entity) => total + entity.SplitValue, 0);

        splitAmount = (splitEntity.SplitValue / totalRatio) * openingRatioBalance;
        
        totalInstanceOfRatio -= 1
        break;
      default:
        break;
    }

    // Validate split amount constraints
    if (splitAmount > balance) {
      return res.status(400).json({ error: 'Split amount exceeds transaction amount' });
    }

    splitBreakdown.push({ SplitEntityId: splitEntity.SplitEntityId, Amount: splitAmount });
    balance -= splitAmount;
  }

  if (balance < 0) {
    return res.status(400).json({ error: 'Final balance cannot be less than 0' });
  }

//   if (balance > 0) {
//     return res.status(400).json({ error: 'Sum of split amounts exceeds transaction amount' });
//   }

  // Prepare response
  const response = {
    ID,
    Balance: balance,
    SplitBreakdown: splitBreakdown,
  };
  console.log(response)

  return res.status(200).json(response);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});