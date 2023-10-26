async function createOrderCallback() {
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // use the "body" param to optionally pass additional order information
      // like product ids and quantities
      body: JSON.stringify({
        cart: [
          {
            id: "YOUR_PRODUCT_ID",
            quantity: "YOUR_PRODUCT_QUANTITY",
          },
        ],
      }),
    });

    const orderData = await response.json();

    if (orderData.id) {
      return orderData.id;
    } else {
      const errorDetail = orderData?.details?.[0];
      const errorMessage = errorDetail
        ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
        : JSON.stringify(orderData);

      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error(error);
    resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
  }
}

async function onApproveCallback(data, actions) {
  try {
    const response = await fetch(`/api/orders/${data.orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const orderData = await response.json();
    // Three cases to handle:
    //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
    //   (2) Other non-recoverable errors -> Show a failure message
    //   (3) Successful transaction -> Show confirmation or thank you message

    const transaction =
      orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
      orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
    const errorDetail = orderData?.details?.[0];

    // this actions.restart() behavior only applies to the Buttons component
    if (errorDetail?.issue === "INSTRUMENT_DECLINED" && !data.card && actions) {
      // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
      // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
      return actions.restart();
    } else if (
      errorDetail ||
      !transaction ||
      transaction.status === "DECLINED"
    ) {
      // (2) Other non-recoverable errors -> Show a failure message
      let errorMessage;
      if (transaction) {
        errorMessage = `Transaction ${transaction.status}: ${transaction.id}`;
      } else if (errorDetail) {
        errorMessage = `${errorDetail.description} (${orderData.debug_id})`;
      } else {
        errorMessage = JSON.stringify(orderData);
      }

      throw new Error(errorMessage);
    } else {
      // (3) Successful transaction -> Show confirmation or thank you message
      // Or go to another URL:  actions.redirect('thank_you.html');
      resultMessage(
        `Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`,
      );
      console.log(
        "Capture result",
        orderData,
        JSON.stringify(orderData, null, 2),
      );
    }
  } catch (error) {
    console.error(error);
    resultMessage(
      `Sorry, your transaction could not be processed...<br><br>${error}`,
    );
  }
}

document.querySelectorAll('input[name=payment-option]').forEach(function(el) {
  el.addEventListener('change', function(event) {

      // If PayPal is selected, show the PayPal button
      if (event.target.value === 'paypal') {
          document.querySelector('#paylater-button-container').style.display = 'none';
          document.querySelector('#giropay-payfield-container').style.display = 'none';
          document.querySelector('#giropay-button-container').style.display = 'none';
          document.querySelector('#paypal-button-container').style.display = 'block';
          document.querySelector('#card-button-container').style.display = 'none';
      }

      // If Card is selected, show the standard continue button
      if (event.target.value === 'paylater') {
          document.querySelector('#paylater-button-container').style.display = 'block';
          document.querySelector('#paypal-button-container').style.display = 'none';
          document.querySelector('#giropay-payfield-container').style.display = 'none';
          document.querySelector('#giropay-button-container').style.display = 'none';
          document.querySelector('#card-button-container').style.display = 'none';
      }

      if (event.target.value === 'giropay') {
        document.querySelector('#paylater-button-container').style.display = 'none';
        document.querySelector('#paypal-button-container').style.display = 'none';
        document.querySelector('#giropay-payfield-container').style.display = 'block';
        document.querySelector('#giropay-button-container').style.display = 'block';
        document.querySelector('#card-button-container').style.display = 'none';
      }

      if (event.target.value === 'card') {
        document.querySelector('#paylater-button-container').style.display = 'none';
        document.querySelector('#paypal-button-container').style.display = 'none';
        document.querySelector('#giropay-payfield-container').style.display = 'none';
        document.querySelector('#giropay-button-container').style.display = 'none';
        document.querySelector('#card-button-container').style.display = 'block';
      }
  });
});

document.querySelector('#paylater-button-container').style.display = 'none';
document.querySelector('#giropay-payfield-container').style.display = 'none';
document.querySelector('#giropay-button-container').style.display = 'none';
document.querySelector('#card-button-container').style.display = 'none';

var FUNDING_SOURCES = [
  paypal.FUNDING.PAYPAL,
  paypal.FUNDING.PAYLATER,
  paypal.FUNDING.GIROPAY,
  paypal.FUNDING.CARD,
];

FUNDING_SOURCES.forEach(function (fundingSource) {
  // Initialize the buttons
  var button = paypal.Buttons({
    fundingSource: fundingSource,
    style: {
      color: (fundingSource==paypal.FUNDING.PAYLATER) ? 'gold' : '',
    },
    createOrder: createOrderCallback,
    onApprove: onApproveCallback,
  }).render("#"+fundingSource+"-button-container")
  
  paypal.Marks({
    fundingSource: fundingSource
  }).render("#"+fundingSource+"-mark");
});

/* paypal.Buttons({
    fundingSource: paypal.FUNDING.GIROPAY,
    createOrder: createOrderCallback,
    onApprove: onApproveCallback,
}).render("#paypal-button-container");
 */


paypal.PaymentFields({
  fundingSource: paypal.FUNDING.GIROPAY,
  style: {
    // style object (optional)
  },
  fields: {
    // fields prefill info (optional)
    name: {
      value: "John Doe",
    },
  }
}).render("#giropay-payfield-container");


// Render each field after checking for eligibility
/* if (cardField.isEligible()) {
  const nameField = cardField.NameField();
  nameField.render("#card-name-field-container");

  const numberField = cardField.NumberField();
  numberField.render("#card-number-field-container");

  const cvvField = cardField.CVVField();
  cvvField.render("#card-cvv-field-container");

  const expiryField = cardField.ExpiryField();
  expiryField.render("#card-expiry-field-container");

  // Add click listener to submit button and call the submit function on the CardField component
  document
    .getElementById("multi-card-field-button")
    .addEventListener("click", () => {
      cardField.submit().catch((error) => {
        resultMessage(
          `Sorry, your transaction could not be processed...<br><br>${error}`,
        );
      });
    });
} else {
  // Hides card fields if the merchant isn't eligible
  document.querySelector("#card-form").style = "display: none";
} */

// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
  const container = document.querySelector("#result-message");
  container.innerHTML = message;
}
