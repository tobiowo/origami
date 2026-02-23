/**
 * Step definitions for the Golden Venture unit tutorial.
 * Using exact descriptions from the user's request.
 */

export const steps = [
  {
    title: "Paper Selection",
    description: `
      <p>Golden Venture units are typically folded from small rectangles with a <strong>1:1.5</strong> or <strong>1:2</strong> aspect ratio.</p>
      <p>Standard A4 paper can be divided into 32 pieces to get this size (~37mm x 52.5mm).</p>
    `,
    sliderEnabled: false,
    foldPercent: 0,
  },
  {
    title: "Step 1: Lengthwise Fold",
    description: `
      <p>Fold the paper in half, along the long side. Ensure the crease is facing towards the bottom.</p>
    `,
    sliderEnabled: true,
    stepFunc: "step1",
  },
  {
    title: "Step 2: Find the Center",
    description: `
      <p>Fold the paper in half, along the short side this time, to make a crease. Then, open the fold back up.</p>
    `,
    sliderEnabled: true,
    stepFunc: "step2",
  },
  {
    title: "Step 3: Make a Point",
    description: `
      <p>On each side of the crease you just made, fold the bottom edge up to meet that crease. This should make a point at the bottom.</p>
    `,
    sliderEnabled: true,
    stepFunc: "step3",
  },
  {
    title: "Step 4: Turn Around",
    description: `
      <p>Turn the piece around to the other side.</p>
    `,
    sliderEnabled: true,
    stepFunc: "step4",
  },
  {
    title: "Step 5: Corner Folds",
    description: `
      <p>On each of the overhanging rectangular pieces, fold the outer corner down so the short edge meets the top edge of the large triangle.</p>
    `,
    sliderEnabled: true,
    stepFunc: "step5",
  },
  {
    title: "Step 6: Lock Flaps",
    description: `
      <p>Fold the overhanging pieces down over the top. The folded corner from the last step should be flush with the edge of the triangle.</p>
    `,
    sliderEnabled: true,
    stepFunc: "step6",
  },
  {
    title: "Step 7: Final Vertical Fold",
    description: `
      <p>Finally, fold the triangle down the middle.</p>
      <p>This creates the final <strong>triangular unit</strong> with two points and two pockets.</p>
    `,
    sliderEnabled: true,
    stepFunc: "step8",
  },
  {
    title: "Completed Unit",
    description: `
      <p>Congratulations! You've folded a Golden Venture unit.</p>
      <p>Look at the base — you'll see <strong>two pockets</strong>. These are used to interlock with the <strong>two points</strong> of other units.</p>
    `,
    sliderEnabled: false,
    foldPercent: 1.0,
    stepFunc: "step8",
  },
  {
    title: "Assembly: The First Ring",
    description: `
      <p>Now that you know how to fold a unit, let's see how they assemble.</p>
      <p>A <strong>ring</strong> of units forms the base. Here is a ring of 18 units.</p>
    `,
    renderer: "assembly",
    ringCount: 18,
    rows: 1,
  },
  {
    title: "Assembly: Stacking Rows",
    description: `
      <p>Units are stacked in a <strong>brick-laying pattern</strong>. Each unit in the new row captures one point from two different units below.</p>
      <p>This interlocking creates a very strong structure without any glue!</p>
    `,
    renderer: "assembly",
    ringCount: 18,
    rows: 3,
  },
  {
    title: "Assembly: Building Up",
    description: `
      <p>Continue stacking rows to build a cylinder. This is the foundation for vases, swans, and many other sculptures.</p>
    `,
    renderer: "assembly",
    ringCount: 18,
    rows: 8,
  },
  {
    title: "Example: Diamond-Pattern Cup",
    description: `
      <p>By using different colors in each row, you can create complex patterns.</p>
      <p>This diamond pattern is created by strategically placing colored units in an offset brick-laying sequence.</p>
    `,
    renderer: "assembly",
    layout: "VjJhIzAwMDBGRi1iIzAxYjc3YS1jI2ZmMDBmZi1kIzAwMDAwMC1lI2JkMDA4MS1mIzU0MDBkMT5EZWZhdWx0PFo6QWEyQWQyQWUzQWQyQWMzQWQyQWYzQWQyQWIzQWQyQWF8WDpBYTJBZEFlQWRBZTJBZEFjQWRBYzJBZEFmQWRBZjJBZEFiQWRBYjJBZEFhQWR8WjpBYUFkQWUyQWRBZUFkQWMyQWRBY0FkQWYyQWRBZkFkQWIyQWRBYkFkQWEyQWR8WDpBZDJBZTNBZDJBYzNBZDJBZjNBZDJBYjNBZDJBYTN8WjpBZEFlNEFkQWM0QWRBZjRBZEFiNEFkQWE0fFg6QWQyQWUzQWQyQWMzQWQyQWYzQWQyQWIzQWQyQWEzfFo6QWVBZEFlMkFkQWNBZEFjMkFkQWZBZEFmMkFkQWJBZEFiMkFkQWFBZEFhMkFkfFg6QWUyQWRBZUFkQWMyQWRBY0FkQWYyQWRBZkFkQWIyQWRBYkFkQWEyQWRBYUFkfFo6QWUyQWQyQWMzQWQyQWYzQWQyQWIzQWQyQWEzQWQyQWV8WDpBZTNBZEFjNEFkQWY0QWRBYjRBZEFhNEFkQWV8WjpBZTJBZDJBYzNBZDJBZjNBZDJBYjNBZDJBYTNBZDJBZXxYOkFlMkFkQWNBZEFjMkFkQWZBZEFmMkFkQWJBZEFiMkFkQWFBZEFhMkFkQWVBZHxaOkFlQWRBYzJBZEFjQWRBZjJBZEFmQWRBYjJBZEFiQWRBYTJBZEFhQWRBZTJBZHxYOkFkMkFjM0FkMkFmM0FkMkFiM0FkMkFhM0FkMkFlM3xaOkFkQWM0QWRBZjRBZEFiNEFkQWE0QWRBZTR8WDpBZDJBYzNBZDJBZjNBZDJBYjNBZDJBYTNBZDJBZTN8WjpBY0FkQWMyQWRBZkFkQWYyQWRBYkFkQWIyQWRBYUFkQWEyQWRBZUFkQWUyQWR8WDpBYzJBZEFjQWRBZjJBZEFmQWRBYjJBZEFiQWRBYTJBZEFhQWRBZTJBZEFlQWR8WjpBYzJBZDJBZjNBZDJBYjNBZDJBYTNBZDJBZTNBZDJBY3xYOkFjM0FkQWY0QWRBYjRBZEFhNEFkQWU0QWRBYw=="
  },
  {
    title: "Example: Vase with Flower",
    description: `
      <p>Golden Venture models can consist of multiple independent parts. Here is a vase with a single flower stalk.</p>
    `,
    renderer: "assembly",
    layout: "VjJhIzM4YzNmZi1iI2ZiNDZjYi1jI2ZmZWEwMC1kIzk1ZTIzNi1lI2JlNWNmZi1mI2U2OWQwMC1nI2ZmZmZmZj5WYXNlPFg6QWEzQWIzQWMzQWczQWQzQWUzQWYzQWczfFo6QWdBYTNBYjNBYzNBZzNBZDNBZTNBZjNBZzJ8WDpBZzJBYTNBYjNBYzNBZzNBZDNBZTNBZjNBZ3xaOkFnM0FhM0FiM0FjM0FnM0FkM0FlM0FmM3xYOkFmQWczQWEzQWIzQWMzQWczQWQzQWUzQWYyfFo6QWYyQWczQWEzQWIzQWMzQWczQWQzQWUzQWZ8WDpBZjNBZzNBYTNBYjNBYzNBZzNBZDNBZTN8WjpBZUFmM0FnM0FhM0FiM0FjM0FnM0FkM0FlMnxYOkFlMkFmM0FnM0FhM0FiM0FjM0FnM0FkM0FlfFo6QWUzQWYzQWczQWEzQWIzQWMzQWczQWQzfFg6QWRBZTNBZjNBZzNBYTNBYjNBYzNBZzNBZDJ8WjpBZDJBZTNBZjNBZzNBYTNBYjNBYzNBZzNBZHxXOkFkM0FlM0FmM0FnM0FhM0FiM0FjM0FnM3xYOkJnQmQyQmUyQmYyQmcyQmEyQmIyQmMyQmd8WDpBZzJBZDJBZTJBZjJBZzJBYTJBYjJBYzJ8WDpBY0FnMkFkMkFlMkFmMkFnMkFhMkFiMkFjfFg6QWMyQWcyQWQyQWUyQWYyQWcyQWEyQWIyfFg6QWJBYzJBZzJBZDJBZTJBZjJBZzJBYTJBYnxYOkFiMkFjMkFnMkFkMkFlMkFmMkFnMkFhMkFiMkFjfFg6QWFBYjJBYzJBZzJBZDJBZTJBZjJBZzJBYXxYOkFhQ2FBYUFiQ2JBYkFjQ2NBY0FnQ2dBZ0FkQ2RBY0FlQ2VBYUZmQ2ZBZkFnQ2dBZ3xaOkFnQWEzQWIzQWMzQWczQWQzQWUzQWYzQWczfFg6RWcyRWEzRWIzRWMzRWczRWQzRWUzRWYzRWc+Rmxvd2VyPFo6QWR8WTpBZHxaOkFkZll6QWR8WjpBZHxZOkFkfFo6QWR8WTpBZHxaOkFkZll6QWR8WjpBZHxZOkFkfFo6QWR8WTpBZHxaOkFkZll6QWR8WjpBZHxYOkFkMnxaOkFkNnxYOkFkNnxaOkNiQWJDYkFkQ2JBYkNiQWRDYkFiQ2JBZHxYOkFiMTJ8WjpBYjEyfFg6QWIxMnxaOkFiMTJ8WDpBYkZiQWJGYkFiRmJBYkZiQWJGYkFiRmI="
  },
  {
    title: "Example: Swan",
    description: `
      <p>The swan is a classic of Golden Venture folding. It uses several parts: a body, a long curved neck, and tail feathers.</p>
    `,
    renderer: "assembly",
    layout: "VjJhIzAwMDBGRi1iI2ZmNjYwMC1jIzAwODAwMC1kIzAwMDAwMC1lI0ZGRkZGRi1mIzgwMDA4MD5Cb2R5PFo6QWUzMHxYOkFlMzB8WjpBZTMwfFg6QWUzMHxaOkFlMzB8WDpBZTMwfFo6QWU3RmVBZTE0RmVBZTd8WDpBZTdGZTJBZTEzRmUyQWU2fFo6QWU2RmUzQWUxMkZlM0FlNnxYOkFlNkZlNEFlMTFGZTRBZTV8WjpBZTVGZTVBZTEwRmU1QWU1fFg6WU1GZTYWVTlGZTZBVTRAfFo6QTQwRmU3QVU4RmU3QTQwZll6QTQwRmU4QVU3RmU4QTMwfFo6QTMwRmU5QVU2RmU5QTMwfFg6QTMwRmUxMEFVTUZlMTBBMjB8WjpBMjBGZTExQVU0RmUxMUEyMHxYOkEyMEZlMTJBVTNGZTEyQWV8WjpBZmVlMTNBZTIwRmUxM0FlfFg6QWZmZTE0QWZmZTE0Pk5lY2s8WjpBZXxaOkFlfFo6QWV8WjpBZXxaOkFlfFo6QWV8WjpBZXxaOkFlfFo6QWV8WjpBZXxaOkFlfFo6QWV8WjpBZXxaOkFlfFo6QWV8WjpBZXxaOkFlfFo6QWV8WjpBZXxaOkFlfFo6QWV8WjpBZXxaOkFlfFo6QWJ+VGFpbDxaOkFlfFo6QWV8WjpBZXxaOkFlfFo6QWUA"
  },
  {
    title: "Example: GreatBall",
    description: `
      <p>This spherical model (resembling a PokeBall) demonstrates how row piece counts can expand and then contract to form a curved, closed volume.</p>
    `,
    renderer: "assembly",
    layout: "VjJhIzBiNzRmZS1iI0ZGMDAwMC1jIzAwODAwMC1kIzAwMDAwMC1lI0ZGRkZGRi1mIzgwMDA4MD5EZWZhdWx0PFg6QWU0fFo6QWVDZUFlQ2VBZUNlQWVDZXxYOkFlQ2VBZUNlQWVDZUFlQ2VBZUNlQWVDZUFlQ2VBZUNlfFo6QWU0Q2VBZTRDZUFlNENlQWU0Q2V8WDpBZTIwfFo6QWU1Q2VBZTVDZUFlNUNlQWU1Q2V8WDpBZTZDZUFlNkNlQWU2Q2VBZTZDZXxaOkFlNUNlQWU3Q2VBZDNBZTRDZUFlN0NlQWUyfFg6QWUxNEFkQWUyQWRBZTE0fFo6QWQxNEFlM0FkMTV8WDpBYTE0QWRBZTJBZEFhMTR8WjpBYTE0QWQzQWExNXxYOkJhMkFiMkFhM0JhMkFhQWIyQWEyQmEyQWIyQWEzQmEyQWFBYjJBYTJ8WjpCYUJiQWIyQWEyQmIyQWJBYTNCYUJiQWIyQWEyQmIyQWJBYTNCfFg6QmEyQWJmQmIyQWJmQmEyQmEyQmJmQmIyQmJmQmEyfFo6QWUyQWJmQWUyQWJmQWUyfFg6QWUzQWJmQWU2QWJmQWUzfFo6QmEyQmJmQmEyQWFBYTRCYmZCYTRBYWF8WDpCYTRBYUNhNGFh"
  },
  {
    title: "Example: Small Sphere",
    description: `
      <p>A simpler version of the spherical geometry. This demonstrates the core principle of expanding and then contracting to form a rounded, closed volume.</p>
    `,
    renderer: "assembly",
    layout: "VmpKaGVTTkdSa1pHUmtZK1UyMWhiR3dnVTNCb1pYSmxQRm82UVdVMmZGbzZRV1V4TW54YU9rRmxNVGg4V2pwQlpUSXlmRm82UVdVeU1ueGFPa0ZsTVRoOFdqcEJaVEV5ZkZvNlFXVTI="
  },
  {
    title: "Example: Mini Pineapple",
    description: `
      <p>The pineapple is a classic modular origami project. It uses a repeating color pattern and a separate "crown" part on top.</p>
    `,
    renderer: "assembly",
    layout: "VjJheSNGRkQ3MDAtZyMyMjhCMjI+Qm9keTxaOkF5MTJ8WjpBeTEyfFo6QXkxMnxaOkF5MTJ8WjpBeTEyfFo6QXkxMnw+Q3Jvd248WjpBZzh8WjpBZzg="
  },
];
