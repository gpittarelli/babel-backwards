// from https://github.com/fkling/astexplorer/pull/161
export default function objectShorthand() {
  return {
    visitor: {
      ObjectProperty({node}) {
        if (!node.shorthand && node.key.name === node.value.name) {
          node.shorthand = true;
        }
      }
    }
  };
}
