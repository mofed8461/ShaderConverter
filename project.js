var srcTxt = null;

function setHeight(fieldId){
    document.getElementById(fieldId).style.height = document.getElementById(fieldId).scrollHeight+'px';
}

function changed()
{
	setHeight("vstxt");
	setHeight("pstxt");
	setHeight("hlsltxt");
	var pCode = PrepareCode(srcTxt.value);
	if (pCode.type != "success")
	{
		document.getElementById("vstxt").value = pCode.error;
		document.getElementById("pstxt").value = pCode.error;
		return;
	}
	var pData = PrepareData(pCode.output);
	if (pData.type != "success")
	{
		document.getElementById("vstxt").value = pData.error;
		document.getElementById("pstxt").value = pData.error;
		return;
	}
	var vsps = identifyVSandPS(pData.output);
	if (vsps.type != "success")
	{
		document.getElementById("vstxt").value = vsps.error;
		document.getElementById("pstxt").value = vsps.error;
		return;
	}
	var vstranslated = translateVS(pData.output[1], vsps.output[0]);
	if (vstranslated.type != "success")
	{
		document.getElementById("vstxt").value = vstranslated.error;
		document.getElementById("pstxt").value = vstranslated.error;
		return;
	}
	var pstranslated = translatePS(pData.output[1], vstranslated.output[1], vsps.output[1], vstranslated.output[2]);
	if (pstranslated.type != "success")
	{
		document.getElementById("pstxt").value = pstranslated.error;
		return;
	}

	var globals = getGlobals(pCode.output[0], pData.output[2]);
	if (globals.type != "success")
	{
		document.getElementById("vstxt").value = globalVar.error;
		document.getElementById("pstxt").value = globalVar.error;
		return;
	}
	var globalsTranslated = translateGlobalVars(globals.output);
	if (globalsTranslated.type != "success")
	{
		document.getElementById("vstxt").value = globalsTranslated.error;
		document.getElementById("pstxt").value = globalsTranslated.error;
		return;
	}
	var vs120code = translateTextures(globals.output, "#version 120\n" + globalsTranslated.output + "\n" + vstranslated.output[0]);
	var ps120code = translateTextures(globals.output, "#version 120\n" + globalsTranslated.output + "\n" + pstranslated.output);
	document.getElementById("vstxt").value = vs120code;
	document.getElementById("pstxt").value = ps120code;
	document.getElementById("vs330txt").value = convertVS120toVS330(vs120code);
	document.getElementById("ps330txt").value = convertPS120toPS330(ps120code);
	setHeight("vstxt");
	setHeight("pstxt");
	setHeight("vs330txt");
	setHeight("ps330txt");
}


function PrepareCode(instr)
{
	var funcs = [];
	var structs = [];
	var str = instr;
	var techniques = 0;
	for (var i = 0; i < str.length - 9; i++) 
	{
		if (str.substr(i, 9) == "technique")
		{
			var j = i;
			while(j < str.length && str[j] != "}")
				j++;
			j++;

			if (j >= str.length)
				break;

			while(j < str.length && str[j] != "}")
				j++;

			if (j >= str.length)
				break;
			j++;

			str = str.substring(0, i) + str.substr(j);
			techniques++;
		}
	}
	if (techniques > 1)
		return {"type":"error", "error":"more than one shader detected"};

	for (var i = 0; i < str.length - 5; i++) 
	{
		if (str.substr(i, 5) == "float")
			if (parseInt(str[i + 5]) >= '2' && parseInt(str[i + 5]) <= '4')
				if(str[i + 6] == 'x')
				{
					str = str.substring(0, i) + "mat" + str[i + 5] + str.slice(i + 8);
					i = i - 7;
				}
				else
				{
					str = str.substring(0, i) + "vec" + str[i + 5] + str.slice(i + 6);
					i = i - 7;
				}
	}


	
	
	for (var i = 0; i < str.length - 9; i++) 
	{
		
		var obj = {};



		var j = i;
		obj.SReturnType = j;
		while ((str[j] >= "a" && str[j] <= "z") || (str[j] >= "A" && str[j] <= "Z") || str[j] == "_" || (str[j] >= "0" && str[j] <= "9"))
		{
			j++;
			if (j > str.length - 5)
			{
				j = -99;
				break;
			}
		}
		if (j == -99)
			continue;

		obj.EReturnType = j;
		
		while(str[j] == " " || str[j] == "\n" || str[j] == "\r")
		{
			j++;
			if (j > str.length - 5)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		obj.SName = j;
		while ((str[j] >= "a" && str[j] <= "z") || (str[j] >= "A" && str[j] <= "Z") || str[j] == "_" || (str[j] >= "0" && str[j] <= "9"))
		{
			j++;
			if (j > str.length - 5)
			{
				j = -99;
				break;
			}
		}
		if (j == -99)
			continue;
		obj.EName = j;
		
		while(str[j] == " " || str[j] == "\n" || str[j] == "\r")
		{
			j++;
			if (j > str.length - 5)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (str[j] == "(")
		{
			j++;
			obj.SParameters = j;
			while(str[j] != ")")
			{
				j++;
				if (j > str.length - 3)
				{
					j = -99;
					break;
				}
			}
			if (j == -99)
				continue;

			obj.EParameters = j;
			j++;

			while(str[j] == " " || str[j] == "\n" || str[j] == "\r")
			{
				j++;
				if (j > str.length - 2)
				{
					j = -99;
					break;
				}
			}

			if (j == -99)
				continue;

			if (str[j] == ":") // (optional)semantic
			{
				j++;
				while(str[j] == " " || str[j] == "\n" || str[j] == "\r")
				{
					j++;
					if (j > str.length - 2)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				obj.SReturnSemantic = j;
				while ((str[j] >= "a" && str[j] <= "z") || (str[j] >= "A" && str[j] <= "Z") || str[j] == "_" || (str[j] >= "0" && str[j] <= "9"))
				{
					j++;
					if (j > str.length - 5)
					{
						j = -99;
						break;
					}
				}
				if (j == -99)
					continue;

				obj.EReturnSemantic = j;

				while(str[j] == " " || str[j] == "\n" || str[j] == "\r")
				{
					j++;
					if (j > str.length - 2)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;
			}

			if (str[j] != "{")// body
				continue;

			var bracket = 1;

			
			j++;
			obj.SCode = j;

			while (bracket != 0)
			{
				if (j >= str.length)
				{
					j = -99;
					break;
				}
				if (str[j] == "{")
					bracket++;
				else if (str[j] == "}")
					bracket--;
				j++;
			}
			if (j == -99)
				continue;
			obj.ECode = j - 1;

			obj.ReturnType = str.substring(obj.SReturnType, obj.EReturnType);
			obj.Name = str.substring(obj.SName, obj.EName);
			obj.Parameters = str.substring(obj.SParameters, obj.EParameters);
			obj.Code = str.substring(obj.SCode, obj.ECode);
			if (obj.SReturnSemantic != undefined)
				obj.ReturnSemantic = str.substring(obj.SReturnSemantic, obj.EReturnSemantic);
			
			funcs.push(obj);
			i = j;
		}
			
		
	}

	for (var i = 0; i < str.length - 9; i++) 
	{
		
		var obj = {};
		if (str.substr(i, 7) != "struct " && str.substr(i, 7) != "struct\n")
			continue;
		


		var j = i + 7;

		while(str[j] == " " || str[j] == "\n" || str[j] == "\r")
		{
			j++;
			if (j > str.length - 2)
			{
				j = -99;
				break;
			}
		}
		if (j == -99)
			continue;

		obj.SName = j;
		while ((str[j] >= "a" && str[j] <= "z") || (str[j] >= "A" && str[j] <= "Z") || str[j] == "_" || (str[j] >= "0" && str[j] <= "9"))
		{
			j++;
			if (j > str.length - 5)
			{
				j = -99;
				break;
			}
		}
		if (j == -99)
			continue;
		obj.EName = j;

		while(str[j] == " " || str[j] == "\n" || str[j] == "\r")
		{
			j++;
			if (j > str.length - 2)
			{
				j = -99;
				break;
			}
		}
		if (j == -99)
			continue;

		if (str[j] != "{")
			continue;
		
		j++;

		obj.SMembers = j;
		while(str[j] != "}")
		{
			j++;
			if (j > str.length - 2)
			{
				j = -99;
				break;
			}
		}
		if (j == -99)
			continue;
		obj.EMembers = j;

		obj.Name = str.substring(obj.SName, obj.EName);
		obj.Members = str.substring(obj.SMembers, obj.EMembers);
		structs.push(obj);
		i = j;
	}
	return {"type":"success", "output":[str, structs, funcs]};
}

function PrepareData(data)
{
	for (var i = 0; i < data[1].length; i++)
	{
		data[1][i].Members = data[1][i].Members.replace(/;/g, ",").split(",");
		for (var j = data[1][i].Members.length - 1; j >= 0; j--)
		{
			if (data[1][i].Members[j].replace(/ /g, "").replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "") == "")
			{
				data[1][i].Members.splice(j, 1);
				continue;
			}

			data[1][i].Members[j] = data[1][i].Members[j].split(":");// [vec4 data, semantic]

			if (data[1][i].Members[j].length == 2)
				data[1][i].Members[j][1] = data[1][i].Members[j][1].replace(/ /g, "").replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "");
			var type_name = data[1][i].Members[j][0].split(" ");
			for (var k = type_name.length - 1; k >= 0; k--) 
			{
				type_name[k] = type_name[k].replace(/ /g, "").replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "");
				if (type_name[k] == "")
					type_name.splice(k, 1);
			}
			if (type_name.length != 2)
				return {"type":"error", "error":"struct member parsing error"};

			data[1][i].Members[j] = [type_name[0], type_name[1], data[1][i].Members[j][1]];
		}
	}

	for (var i = 0; i < data[2].length; i++)
	{
		data[2][i].Parameters = data[2][i].Parameters.replace(/;/g, ",").split(",");
		for (var j = data[2][i].Parameters.length - 1; j >= 0; j--)
		{
			if (data[2][i].Parameters[j].replace(/ /g, "").replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "") == "")
			{
				data[2][i].Parameters.splice(j, 1);
				continue;
			}
 
			data[2][i].Parameters[j] = data[2][i].Parameters[j].split(":");// [vec4 data, semantic]

			if (data[2][i].Parameters[j].length == 2)
				data[2][i].Parameters[j][1] = data[2][i].Parameters[j][1].replace(/ /g, "").replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "");
			var type_name = data[2][i].Parameters[j][0].split(" ");
			for (var k = type_name.length - 1; k >= 0; k--) 
			{
				type_name[k] = type_name[k].replace(/ /g, "").replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "");
				if (type_name[k] == "")
					type_name.splice(k, 1);
			}

			if (type_name.length == 3)
				data[2][i].Parameters[j] = [type_name[1], type_name[2], data[2][i].Parameters[j][1], type_name[0]];
			else if (type_name.length == 2)
				data[2][i].Parameters[j] = [type_name[0], type_name[1], data[2][i].Parameters[j][1]];
			else
				return {"type":"error", "error":"function parameter parsing error"};
			
		}
	}


	return {"type":"success", "output":data};
}

function identifyVSandPS(data)
{
	//data : [Code:"", structs:[{Name, Members}], funcs:[{ReturnType, Name, Parameters, ?ReturnSemantic?, Code}] ]
	
	// idea:

	// determine VS and PS
	// determine input and output type

	// VS output always has “POSITION”

	// PS output always has “COLORx” only
	// output shape:
	// return vec4 x
	// return struct x
	// parameter out vec4 ..x
	var PSFunction = null;
	var VSFunction = null;
	for (var i = 0; i < data[2].length; i++) 
	{
		if (data[2][i].ReturnSemantic == "COLOR" || data[2][i].ReturnSemantic == "COLOR0")
		{
			PSFunction = data[2][i];
			break;
		}
		if (data[2][i].ReturnType != "void")
		{
			for (var j = data[1].length - 1; j >= 0; j--) 
			{
				if (data[1][j].Name == data[2][i].ReturnType)
				{
					var flag = true;
					for (var k = data[1][j].Members.length - 1; k >= 0; k--) 
					{
						if (data[1][j].Members[k][2].indexOf("COLOR") == -1 && data[1][j].Members[k][2].indexOf("DEPTH") == -1)
						{
							flag = false;
							break;
						}
					}
					if (flag)
					{
						PSFunction = data[2][i];
						break;
					}
				}
			}
			if (PSFunction != null)
				break;
		}
		else
		{
			var flag = true;
			for (var j = data[2][i].Parameters.length - 1; j >= 0; j--) 
			{
				if (data[2][i].Parameters[j].length == 4 && data[2][i].Parameters[j][3] == "out")
				{
					if (data[2][i].Parameters[j][2].indexOf("COLOR") == -1 && data[2][i].Parameters[j][2].indexOf("DEPTH") == -1)
					{
						flag = false;
						break;
					}
				}
			}
			if (flag)
			{
				PSFunction = data[2][i];
				break;
			}
		}
	}
	for (var i = 0; i < data[2].length; i++) 
	{
		if (data[2][i].ReturnSemantic == "POSITION" || data[2][i].ReturnSemantic == "POSITION0")
		{
			VSFunction = data[2][i];
			break;
		}
		if (data[2][i].ReturnType != "void")
		{
			for (var j = data[1].length - 1; j >= 0; j--) 
			{
				if (data[1][j].Name == data[2][i].ReturnType)
				{
					var flag = false;
					for (var k = data[1][j].Members.length - 1; k >= 0; k--) 
					{
						if (data[1][j].Members[k][2].indexOf("POSITION") != -1)
						{
							flag = true;
							break;
						}
					}
					if (flag)
					{
						VSFunction = data[2][i];
						break;
					}
				}
			}
			if (VSFunction != null)
				break;
		}
		else
		{
			var flag = false;
			for (var j = data[2][i].Parameters.length - 1; j >= 0; j--) 
			{
				if (data[2][i].Parameters[j].length == 4 && data[2][i].Parameters[j][3] == "out")
				{
					if (data[2][i].Parameters[j][2].indexOf("POSITION") != -1)
					{
						flag = true;
						break;
					}
				}
			}
			if (flag)
			{
				VSFunction = data[2][i];
				break;
			}
		}

	}

	if (VSFunction == null && PSFunction == null)
		return {"type":"error", "error":"No Vertex shader and Pixel shader found"};
	else if (VSFunction == null)
		return {"type":"error", "error":"No Vertex shader found"};
	else if (PSFunction == null)
		return {"type":"error", "error":"No Pixel shader found"};

	return {"type":"success", "output":[VSFunction, PSFunction]};
	
}


//output
//input
//struct name;
//return
//type cast
//mul
//tex2D texture2D
//tex3D texture3D
//texCUBE textureCube
function translateVS(structs, vs)
{
	var globalVar = [];
	var sharedVariable = [];
	var upperCode = "";
	var finalCode = vs.Code;


	if (vs.ReturnType != "void")
	{
		// search for : %returnType% %xxx%
		//or          : %returnType% %xxx%
		var StructObjectName = null;
		var _struct = null;
		var _structPositionName = null;
		
		for (var i = structs.length - 1; i >= 0; i--) 
		{
			if (structs[i].Name == vs.ReturnType)
			{
				_struct = structs[i];
				break;
			}
		}
		for (var i = _struct.Members.length - 1; i >= 0; i--) 
		{
			if (_struct.Members[i][2].indexOf("POSITION") != -1)
			{
				_structPositionName = _struct.Members[i][1];
				break;
			}
		}

		for (var i = 0; i < vs.Code.length - vs.ReturnType.length; i++) 
		{
			if (vs.Code.substr(i, vs.ReturnType.length) == vs.ReturnType)
			{
				var j = i + vs.ReturnType.length;
				if (vs.Code[j] != " " && vs.Code[j] != "\n" && vs.Code[j] != "\t")
					continue;

				j++;
				while (vs.Code[j] == " " || vs.Code[j] == "\n" || vs.Code[j] == "\r")
				{
					j++;
					if (j > vs.Code.length - 2)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				var objSName = j;

				while ((vs.Code[j] >= "a" && vs.Code[j] <= "z") || (vs.Code[j] >= "A" && vs.Code[j] <= "Z") || vs.Code[j] == "_" || (vs.Code[j] >= "0" && vs.Code[j] <= "9"))
				{
					j++;
					if (j > vs.Code.length - 2)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				StructObjectName = vs.Code.substring(objSName, j);
			}
		}

		finalCode = finalCode.replace(new RegExp(StructObjectName + "." + _structPositionName, "g"), "gl_Position");
		for (var i = 0; i < _struct.Members.length; i++)
		{
			if (_struct.Members[i][2].indexOf("POSITION") == -1)
			{
				globalVar.push("varying " + _struct.Members[i][0] + " s_" + _struct.Members[i][1] + ";");
				sharedVariable.push([_struct.Members[i][0], "s_" + _struct.Members[i][1], _struct.Members[i][2]]);
			}
			finalCode = finalCode.replace(new RegExp(StructObjectName + "." + _struct.Members[i][1], "g"), "s_" + _struct.Members[i][1]);
		}


		
		for (var i = 0; i < finalCode.length - vs.ReturnType.length; i++) 
		{
			if (finalCode.substr(i, vs.ReturnType.length) == vs.ReturnType)
			{
				var j = i + vs.ReturnType.length;
				if (finalCode[j] != " " && finalCode[j] != "\n" && finalCode[j] != "\t")
					continue;

				j++;
				while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
				{
					j++;
					if (j > finalCode.length - 2)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				while ((finalCode[j] >= "a" && finalCode[j] <= "z") || (finalCode[j] >= "A" && finalCode[j] <= "Z") || finalCode[j] == "_" || (finalCode[j] >= "0" && finalCode[j] <= "9"))
				{
					j++;
					if (j > finalCode.length - 2)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				while (finalCode[j] != ";" && finalCode[j] != "=")
				{
					j++;
					if (j > finalCode.length - 1)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				if (finalCode[j] == ";")
				{
					finalCode = finalCode.replace(finalCode.substring(i, j + 1), "");
					i = j;
				}
				else
				{
					return {"type":"error", "error":"Struct type cast failed", "output":finalCode};
				}
			}


		}

		finalCode = finalCode.replace(new RegExp(" " + StructObjectName, "g"), "");
		finalCode = finalCode.replace(new RegExp(StructObjectName, "g"), "");
	}
	else
	{
		var PosName = "";
		for (var i = 0; i < vs.Parameters.length; i++) 
		{
			if (vs.Parameters[i].length == 4)
			{
				if (vs.Parameters[i][2].indexOf("POSITION") != -1)
				{
					PosName = vs.Parameters[i][1];
				}
				else
				{
					globalVar.push("varying " + vs.Parameters[i][0] + " s_" + vs.Parameters[i][1] + ";");
					sharedVariable.push([vs.Parameters[i][0], "s_" + vs.Parameters[i][1], vs.Parameters[i][2]]);
					finalCode = finalCode.replace(new RegExp(vs.Parameters[i][1], "g"), "s_" + vs.Parameters[i][1]);
				}
			}
		}
		
		finalCode = finalCode.replace(new RegExp(PosName, "g"), "gl_Position");

		
	}

	for (var i = vs.Parameters.length - 1; i >= 0; i--) 
	{
		if (vs.Parameters[i].length == 3)
		{
			if (vs.Parameters[i][2] == undefined)
			{
				return {"type":"error", "error":"cannot translate VS input struct", "output":finalCode};
			}
			else
			{
				globalVar.unshift("attribute " + vs.Parameters[i][0] + " " + vs.Parameters[i][1] + ";");
			}
		}
	}

	for (var i = globalVar.length - 1; i >= 0; i--)
	{
		upperCode = globalVar[i] + "\n" + upperCode;
	}
	upperCode = upperCode.replace("varying", "\nvarying");

	// type cast (float3)x to float3(x)
	for (var i = 0; i < finalCode.length - 3; i++) 
	{
		var j = i;

		while (!((finalCode[j] >= "a" && finalCode[j] <= "z") || (finalCode[j] >= "A" && finalCode[j] <= "Z") || finalCode[j] == "_" || finalCode[j] == "(" || (finalCode[j] >= "0" && finalCode[j] <= "9")))
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != "(")
			continue;

		var bracketS = j;
		j++;
		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		while ((finalCode[j] >= "a" && finalCode[j] <= "z") || (finalCode[j] >= "A" && finalCode[j] <= "Z") || finalCode[j] == "_" || (finalCode[j] >= "0" && finalCode[j] <= "9"))
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != ")")
			continue;

		j++;

		var bracketE = j;

		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] == "(")
		{
			finalCode = finalCode.replace(finalCode.substring(bracketS, bracketE), finalCode.substring(bracketS + 1, bracketE - 1));
			i = bracketE;
		}
		else
		{

			while ((finalCode[j] >= "a" && finalCode[j] <= "z") || (finalCode[j] >= "A" && finalCode[j] <= "Z") || finalCode[j] == "_" || (finalCode[j] >= "0" && finalCode[j] <= "9"))
			{
				j++;
				if (j > finalCode.length - 2)
				{
					j = -99;
					break;
				}
			}

			if (j == -99)
				continue;

			finalCode = finalCode.replace(finalCode.substr(j), ")" + finalCode.substr(j));
			finalCode = finalCode.replace(finalCode.substring(bracketS, bracketE), finalCode.substring(bracketS + 1, bracketE - 1) + "(");
			i = j;
		}
	}

	//mul(A,B) B * A
	for (var i = finalCode.indexOf("mul"); i != -1 && i < finalCode.length - 3; i++) 
	{
		var j = i;
		if (finalCode.substr(j, 3) != "mul")
			continue;
		j += 3;

		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != "(")
			continue;

		j++;

		var param1S = j;

		var bracket = 0;

		while (true)
		{
			if (j >= finalCode.length)
			{
				j = -99;
				break;
			}

			if (finalCode[j] == "," && bracket == 0)
				break;

			if (finalCode[j] == "(")
				bracket++;

			if (finalCode[j] == ")")
				bracket--;

			j++;
		}
		if (j == -99)
			continue;

		var param1E = j;

		j++;
		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;
		var param2S = j;



		bracket = 0;

		while (true)
		{
			if (j >= finalCode.length)
			{
				j = -99;
				break;
			}

			if (finalCode[j] == ")" && bracket == 0)
				break;

			if (finalCode[j] == "(")
				bracket++;

			if (finalCode[j] == ")")
				bracket--;

			j++;
		}
		if (j == -99)
			continue;

		var param2E = j;

		var p1 = finalCode.substring(param1S, param1E);
		var p2 = finalCode.substring(param2S, param2E);

		finalCode = finalCode.replace(finalCode.substring(i, param2E + 1), p2 + " * " + p1);

	}

	for (var i = finalCode.indexOf("tex2D"); i != -1 && i < finalCode.length - 5; i++) 
	{
		var j = i;
		if (finalCode.substr(j, 5) != "tex2D")
			continue;
		j += 5;

		
		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != "(")
			continue;

		finalCode = finalCode.substring(0, i) + "texture2D" + finalCode.substr(i + 5);
		i += 5;
	}

	for (var i = finalCode.indexOf("tex3D"); i != -1 && i < finalCode.length - 5; i++) 
	{
		var j = i;
		if (finalCode.substr(j, 5) != "tex3D")
			continue;
		j += 5;

		
		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != "(")
			continue;

		finalCode = finalCode.substring(0, i) + "texture3D" + finalCode.substr(i + 5);
		i += 5;
	}

	for (var i = finalCode.indexOf("texCUBE"); i != -1 && i < finalCode.length - 7; i++) 
	{
		var j = i;
		if (finalCode.substr(j, 7) != "texCUBE")
			continue;
		j += 7;

		
		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != "(")
			continue;

		finalCode = finalCode.substring(0, i) + "textureCube" + finalCode.substr(i + 7);
		i += 7;
	}


	while (finalCode[0] == '\n')
		finalCode = finalCode.substr(1);

	finalCode = "void main()\n{\n" + finalCode + "}";

	return {"type":"success", "output":[upperCode + "\n" + finalCode, sharedVariable, upperCode]};
}




//output
//input
//struct name;
//return
//type cast
//mul
//tex2D texture2D
//tex3D texture3D
//texCUBE textureCube
function translatePS(structs, vsoutputs, ps, upperCode)
{
	var finalCode = ps.Code;


	if (ps.ReturnType != "void" && ps.ReturnType != "vec4")
	{
		// search for : %returnType% %xxx%
		//or          : %returnType% %xxx%
		var StructObjectName = null;
		var _struct = null;
		
		for (var i = structs.length - 1; i >= 0; i--) 
		{
			if (structs[i].Name == ps.ReturnType)
			{
				_struct = structs[i];
				break;
			}
		}


		for (var i = 0; i < ps.Code.length - ps.ReturnType.length; i++) 
		{
			if (ps.Code.substr(i, ps.ReturnType.length) == ps.ReturnType)
			{
				var j = i + ps.ReturnType.length;
				if (ps.Code[j] != " " && ps.Code[j] != "\n" && ps.Code[j] != "\t")
					continue;

				j++;
				while (ps.Code[j] == " " || ps.Code[j] == "\n" || ps.Code[j] == "\r")
				{
					j++;
					if (j > ps.Code.length - 2)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				var objSName = j;

				while ((ps.Code[j] >= "a" && ps.Code[j] <= "z") || (ps.Code[j] >= "A" && ps.Code[j] <= "Z") || ps.Code[j] == "_" || (ps.Code[j] >= "0" && ps.Code[j] <= "9"))
				{
					j++;
					if (j > ps.Code.length - 2)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				StructObjectName = ps.Code.substring(objSName, j);
			}
		}

		var containsDepth = false;
		for (var i = 0; i < _struct.Members.length; i++)
		{
			if (_struct.Members[i][2].indexOf("DEPTH") != -1)
			{
				containsDepth = true;
				break;
			}
		}

		if (_struct.Members.length == 1)
		{
			finalCode = finalCode.replace(new RegExp(StructObjectName + "." + _struct.Members[0][1], "g"), "gl_FragColor");
		}
		else if (_struct.Members.length == 2 && containsDepth)
		{
			if (_struct.Members[0][2].indexOf("DEPTH") == -1)
			{
				finalCode = finalCode.replace(new RegExp(StructObjectName + "." + _struct.Members[0][1], "g"), "gl_FragColor");
				finalCode = finalCode.replace(new RegExp(StructObjectName + "." + _struct.Members[1][1], "g"), "gl_FragDepth");
			}
			else
			{
				finalCode = finalCode.replace(new RegExp(StructObjectName + "." + _struct.Members[1][1], "g"), "gl_FragColor");
				finalCode = finalCode.replace(new RegExp(StructObjectName + "." + _struct.Members[0][1], "g"), "gl_FragDepth");	
			}
		}
		else
		{
			for (var i = 0; i < _struct.Members.length; i++) 
			{
				if (_struct.Members[i][2].indexOf("DEPTH") != -1)
				{
					finalCode = finalCode.replace(new RegExp(StructObjectName + "." + _struct.Members[i][1], "g"), "gl_FragDepth");
				}
				else
				{
					var xx = _struct.Members[i][2][_struct.Members[i][2].indexOf("COLOR") + 5];
					finalCode = finalCode.replace(new RegExp(StructObjectName + "." + _struct.Members[i][1], "g"), "gl_FragData[" + xx + "]");
				}
			}
		}


		
		for (var i = 0; i < finalCode.length - ps.ReturnType.length; i++) 
		{
			if (finalCode.substr(i, ps.ReturnType.length) == ps.ReturnType)
			{
				var j = i + ps.ReturnType.length;
				if (finalCode[j] != " " && finalCode[j] != "\n" && finalCode[j] != "\t")
					continue;

				j++;
				while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
				{
					j++;
					if (j > finalCode.length - 2)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				while ((finalCode[j] >= "a" && finalCode[j] <= "z") || (finalCode[j] >= "A" && finalCode[j] <= "Z") || finalCode[j] == "_" || (finalCode[j] >= "0" && finalCode[j] <= "9"))
				{
					j++;
					if (j > finalCode.length - 2)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				while (finalCode[j] != ";" && finalCode[j] != "=")
				{
					j++;
					if (j > finalCode.length - 1)
					{
						j = -99;
						break;
					}
				}

				if (j == -99)
					continue;

				if (finalCode[j] == ";")
				{
					finalCode = finalCode.replace(finalCode.substring(i, j + 1), "");
					i = j;
				}
				else
				{
					return {"type":"error", "error":"Struct type cast failed", "output":finalCode};
				}
			}


		}

		finalCode = finalCode.replace(new RegExp(" " + StructObjectName, "g"), "");
		finalCode = finalCode.replace(new RegExp(StructObjectName, "g"), "");
	}
	else if (ps.ReturnType == "vec4")
	{
		finalCode = finalCode.replace(/return/g, "gl_FragColor =");
		for (var i = 0; i < finalCode.length - 12; i++) 
		{
			if (finalCode.substr(i, 12) == "gl_FragColor")
			{
				var j = i + 12;
				while (finalCode[j] != ";")
					j++;

				var k = i - 1;
				while (k >= 0 && finalCode[k] != ";" && finalCode[k] != ")")
					k--;
				if (finalCode[k] == ")")
				{
					k = i - 1;
					var tab = "";
					while (k >= 0 && finalCode[k] == " " || finalCode[k] == "\t")
						tab += finalCode[k--];

					finalCode = finalCode.substring(0, i - 1) + "{\n" + tab + finalCode.substring(i, j + 1) + "\n" + tab + "return;\n" + tab.substr(0, tab.length - 1) + "}" + finalCode.substr(j + 1);
					i = j;
				}
				else
				{
					k = i - 1;
					var tab = "";
					while (k >= 0 && finalCode[k] == " " || finalCode[k] == "\t")
						tab += finalCode[k--];

					finalCode = finalCode.substring(0, j + 1) + "\n" + tab + "return;" + finalCode.substr(j + 1);
					i = j;
				}
			}
		}
	}
	else
	{
		var outputCount = 0;
		for (var i = 0; i < ps.Parameters.length; i++) 
		{

			if (ps.Parameters[i].length == 4 && ps.Parameters[i][2].indexOf("COLOR") != -1)
			{
				outputCount++;
			}
		}
		if (outputCount == 1)
		{
			for (var i = 0; i < ps.Parameters.length; i++) 
			{
				if (ps.Parameters[i].length == 4 && ps.Parameters[i][2].indexOf("COLOR") != -1)
					finalCode = finalCode.replace(new RegExp(ps.Parameters[i][1], "g"), "gl_FragColor");
				else if (ps.Parameters[i].length == 4 && ps.Parameters[i][2].indexOf("DEPTH") != -1)
					finalCode = finalCode.replace(new RegExp(ps.Parameters[i][1], "g"), "gl_FragDepth");
			}
		}
		else
		{
			for (var i = 0; i < ps.Parameters.length; i++) 
			{
				if (ps.Parameters[i].length == 4 && ps.Parameters[i][2].indexOf("COLOR") != -1)
				{
					var xx = ps.Parameters[i][2][ps.Parameters[i][2].indexOf("COLOR") + 5];
					finalCode = finalCode.replace(new RegExp(ps.Parameters[i][1], "g"), "gl_FragData[" + xx + "]");
				}
				else if (ps.Parameters[i].length == 4 && ps.Parameters[i][2].indexOf("DEPTH") != -1)
					finalCode = finalCode.replace(new RegExp(ps.Parameters[i][1], "g"), "gl_FragDepth");
			}
		}
	}

	for (var i = 0; i < ps.Parameters.length; i++) 
	{
		if (ps.Parameters[i].length == 3)
		{
			if (ps.Parameters[i][2] == undefined)
			{
				var _struct = null;
				for (var j = 0; j < structs.length; j++) 
				{
					if (structs[j].Name == ps.Parameters[i][0])
					{
						_struct = structs[j];
						break;
					}
				}

				for (var j = 0; j < _struct.Members.length; j++) 
				{
					for (var k = 0; k < vsoutputs.length; k++) 
					{
						if (_struct.Members[j][2] == vsoutputs[k][2])
						{
							finalCode = finalCode.replace(new RegExp(ps.Parameters[i][1] + "." + _struct.Members[j][1], "g"), vsoutputs[k][1]);
						}
					}
				}
			}
			else
			{
				for (var k = 0; k < vsoutputs.length; k++) 
				{
					if (ps.Parameters[i][2] == vsoutputs[k][2])
					{
						finalCode = finalCode.replace(new RegExp(ps.Parameters[i][1], "g"), vsoutputs[k][1]);
					}
				}
			}
		}
	}



	

	// type cast (float3)x to float3(x)
	for (var i = 0; i < finalCode.length - 3; i++) 
	{
		var j = i;

		while (!((finalCode[j] >= "a" && finalCode[j] <= "z") || (finalCode[j] >= "A" && finalCode[j] <= "Z") || finalCode[j] == "_" || finalCode[j] == "(" || (finalCode[j] >= "0" && finalCode[j] <= "9")))
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != "(")
			continue;

		var bracketS = j;
		j++;
		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		while ((finalCode[j] >= "a" && finalCode[j] <= "z") || (finalCode[j] >= "A" && finalCode[j] <= "Z") || finalCode[j] == "_" || (finalCode[j] >= "0" && finalCode[j] <= "9"))
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != ")")
			continue;

		j++;

		var bracketE = j;

		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] == "(")
		{
			finalCode = finalCode.replace(finalCode.substring(bracketS, bracketE), finalCode.substring(bracketS + 1, bracketE - 1));
			i = bracketE;
		}
		else
		{

			while ((finalCode[j] >= "a" && finalCode[j] <= "z") || (finalCode[j] >= "A" && finalCode[j] <= "Z") || finalCode[j] == "_" || (finalCode[j] >= "0" && finalCode[j] <= "9"))
			{
				j++;
				if (j > finalCode.length - 2)
				{
					j = -99;
					break;
				}
			}

			if (j == -99)
				continue;

			finalCode = finalCode.replace(finalCode.substr(j), ")" + finalCode.substr(j));
			finalCode = finalCode.replace(finalCode.substring(bracketS, bracketE), finalCode.substring(bracketS + 1, bracketE - 1) + "(");
			i = j;
		}
	}

	//mul(A,B) B * A
	for (var i = finalCode.indexOf("mul"); i != -1 && i < finalCode.length - 3; i++) 
	{
		var j = i;
		if (finalCode.substr(j, 3) != "mul")
			continue;
		j += 3;

		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != "(")
			continue;

		j++;

		var param1S = j;

		var bracket = 0;

		while (true)
		{
			if (j >= finalCode.length)
			{
				j = -99;
				break;
			}

			if (finalCode[j] == "," && bracket == 0)
				break;

			if (finalCode[j] == "(")
				bracket++;

			if (finalCode[j] == ")")
				bracket--;

			j++;
		}
		if (j == -99)
			continue;

		var param1E = j;

		j++;
		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;
		var param2S = j;



		bracket = 0;

		while (true)
		{
			if (j >= finalCode.length)
			{
				j = -99;
				break;
			}

			if (finalCode[j] == ")" && bracket == 0)
				break;

			if (finalCode[j] == "(")
				bracket++;

			if (finalCode[j] == ")")
				bracket--;

			j++;
		}
		if (j == -99)
			continue;

		var param2E = j;

		var p1 = finalCode.substring(param1S, param1E);
		var p2 = finalCode.substring(param2S, param2E);

		finalCode = finalCode.replace(finalCode.substring(i, param2E + 1), p2 + " * " + p1);

	}

	for (var i = finalCode.indexOf("tex2D"); i != -1 && i < finalCode.length - 5; i++) 
	{
		var j = i;
		if (finalCode.substr(j, 5) != "tex2D")
			continue;
		j += 5;

		
		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != "(")
			continue;

		finalCode = finalCode.substring(0, i) + "texture2D" + finalCode.substr(i + 5);
		i += 5;
	}

	for (var i = finalCode.indexOf("tex3D"); i != -1 && i < finalCode.length - 5; i++) 
	{
		var j = i;
		if (finalCode.substr(j, 5) != "tex3D")
			continue;
		j += 5;

		
		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != "(")
			continue;

		finalCode = finalCode.substring(0, i) + "texture3D" + finalCode.substr(i + 5);
		i += 5;
	}

	for (var i = finalCode.indexOf("texCUBE"); i != -1 && i < finalCode.length - 7; i++) 
	{
		var j = i;
		if (finalCode.substr(j, 7) != "texCUBE")
			continue;
		j += 7;

		
		while (finalCode[j] == " " || finalCode[j] == "\n" || finalCode[j] == "\r")
		{
			j++;
			if (j > finalCode.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (finalCode[j] != "(")
			continue;

		finalCode = finalCode.substring(0, i) + "textureCube" + finalCode.substr(i + 7);
		i += 7;
	}


	while (finalCode[0] == '\n')
		finalCode = finalCode.substr(1);

	finalCode = "void main()\n{\n" + finalCode + "}";


	while (upperCode.length > 0 && upperCode[0] == "a")
	{
		upperCode = upperCode.substr(upperCode.indexOf(";") + 1);
		while (upperCode.length > 0 && upperCode[0] != "v" && upperCode[0] != "a")
			upperCode = upperCode.substr(1);
	}

	return {"type":"success", "output":upperCode + "\n" + finalCode};
}





function getGlobals(str, funcs)
{
	var vars = [];
	// type name;
	// type name = x;
	// type name = {xx,xx};
	// sampler s = sampler_state
	// {
	//	   xx=xx;
	// };

	for (var i = 0; i < str.length; i++) 
	{
		var j = i;
		if (str[j] == "#")
		{
			var bsFound = false;
			var dir = "";
			do
			{
				while (str[j] != "\n")
				{
					if (str[j] == "\\")
						bsFound = true;

					dir += str[j];
					j++;
				}
				dir += str[j];
			}
			while (bsFound);
			vars.push([dir]);
			i = j;
			continue;
		}
		var typeS = j;
		while ((str[j] >= "a" && str[j] <= "z") || (str[j] >= "A" && str[j] <= "Z") || str[j] == "_" || (str[j] >= "0" && str[j] <= "9"))
		{
			j++;
			if (j > str.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		var typeE = j;

		while (str[j] == " " || str[j] == "\n" || str[j] == "\r")
		{
			j++;
			if (j > str.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		var nameS = j;

		while ((str[j] >= "a" && str[j] <= "z") || (str[j] >= "A" && str[j] <= "Z") || str[j] == "_" || (str[j] >= "0" && str[j] <= "9"))
		{
			j++;
			if (j > str.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		var nameE = j;

		while (str[j] == " " || str[j] == "\n" || str[j] == "\r")
		{
			j++;
			if (j > str.length - 2)
			{
				j = -99;
				break;
			}
		}

		if (j == -99)
			continue;

		if (str[j] == "=" && str.substring(typeS, typeE).indexOf("sampler") != -1)
		{
			while (str.substr(j, 7) != "texture")
				j++;

			j += 7;

			while (!((str[j] >= "a" && str[j] <= "z") || (str[j] >= "A" && str[j] <= "Z") || str[j] == "_" || (str[j] >= "0" && str[j] <= "9")))
			{
				j++;
				if (j > str.length - 2)
				{
					j = -99;
					break;
				}
			}

			var texNameS = j;

			while ((str[j] >= "a" && str[j] <= "z") || (str[j] >= "A" && str[j] <= "Z") || str[j] == "_" || (str[j] >= "0" && str[j] <= "9"))
			{
				j++;
				if (j > str.length - 2)
				{
					j = -99;
					break;
				}
			}

			var texNameE = j;

			var texName = str.substring(texNameS, texNameE);

			while (str[j] != "}")
				j++;

			while (str[j] != ";")
				j++;

			var flag = true;
			for (var k = 0; k < funcs.length; k++)
			{
				if (funcs[k].Code.indexOf(str.substring(i, j)) != -1)
				{
					flag = false;
					break;
				}
			}

			if (flag)
				vars.push([str.substring(i, j), texName]);
			i = j;
		}
		else if (str[j] == ";" || str[j] == "=")
		{
			while (str[j] != "}" && str[j] != ";")
				j++;

			if (str[j] == "}")
				while (str[j] != ";")
					j++;

			var flag = true;
			for (var k = 0; k < funcs.length; k++)
			{
				if (funcs[k].Code.indexOf(str.substring(i, j)) != -1)
				{
					flag = false;
					break;
				}
			}

			if (flag)
				vars.push([str.substring(i, j)]);
			i = j;

		}

		
	}
	for (var i = 0; i < vars.length; i++) 
	{
		if (vars[i][0].substr(0, 7) == "Texture" || vars[i][0].substr(0, 7) == "texture")
			vars[i][0] = "sampler2D" + vars[i][0].substr(7);
	};

	return {"type":"success", "output":vars};
}

function translateGlobalVars(vars)
{
	var str = "";
	for (var i = 0; i < vars.length; i++) 
	{
		if (vars[i].length == 1)
		{
			if (vars[i][0][0] != "#")
				str += "uniform " + vars[i] + ";\n";
			else
				str += vars[i];
		}
	}

	return {"type":"success", "output":str};
}

function translateTextures(vars, code)
{
	var xSpace = [" ", "\n", "\t", "\r", ";", "{", "}", ",", "(", ")"];

	for (var i = 0; i < vars.length; i++) 
	{
		if (vars[i].length == 2)
		{
			var j = 0;
			while (vars[i][0][j] == " " || vars[i][0][j] == "\n" || vars[i][0][j] == "\r")
			{
				j++;
				if (j > vars[i][0].length - 2)
				{
					j = -99;
					break;
				}
			}

			if (j == -99)
				continue;

			while (vars[i][0][j] != " " && vars[i][0][j] != "\n" && vars[i][0][j] != "\t")
				j++;

			while (vars[i][0][j] == " " || vars[i][0][j] == "\n" || vars[i][0][j] == "\r")
			{
				j++;
				if (j > vars[i][0].length - 2)
				{
					j = -99;
					break;
				}
			}

			if (j == -99)
				continue;

			var SName = j;

			while (vars[i][0][j] != " " && vars[i][0][j] != "\n" && vars[i][0][j] != "\t" && vars[i][0][j] != ";" && vars[i][0][j] != "=")
				j++;

			var EName = j;

			var xname = vars[i][0].substring(SName, EName);
			
			for (var k = 0; k < code.length - Math.max(vars[i][1].length, xname.length); k++) 
			{
				for (var k1 = 0; k1 < xSpace.length; k1++) 
				{
					for (var k2 = 0; k2 < xSpace.length; k2++) 
					{
						//code = code.replace(new RegExp(xSpace[k1] + xname + xSpace[k2], "g"), xSpace[k1] + vars[i][1] + xSpace[k2]);
						if (code.substr(k, xname.length + 2) == xSpace[k1] + xname + xSpace[k2])
						{
							code = code.substring(0, k) + xSpace[k1] + vars[i][1] + xSpace[k2] + code.substr(k + xname.length + 2);
						}
					}
				}
			}
		}
	}

	for (var i = 0; i < code.length; i++) 
	{
		if (code.substr(i, 9) == "texture2D")
		{
			var j = i + 9;
			while (code[j] != "(")
				j++;

			j++;

			var bracket = 0;
			while (!(code[j] == "," && bracket == 0))
			{
				if (code[j] == "(")
					bracket++;
				else if (code[j] == ")")
					bracket--;
				j++;
			}

			j++;

			while (code[j] == " " || code[j] == "\n" || code[j] == "\r")
			{
				j++;
				if (j > code.length - 2)
				{
					j = -99;
					break;
				}
			}

			if (j == -99)
				continue;

			var Param2S = j;

			bracket = 0;
			while (!(code[j] == ")" && bracket == 0))
			{
				if (code[j] == "(")
					bracket++;
				else if (code[j] == ")")
					bracket--;
				j++;
			}

			var Param2E = j;



			code = code.substring(0, Param2S) + "vec2(-1.0f, 1.0f) * (vec2(0.0f, 1.0f) - " + code.substring(Param2S, Param2E) + ")" + code.substr(Param2E);
		}
	}

	return code;
}

function convertVS120toVS330(code)
{
	code = code.replace(/varying/g, "out");
	code = code.replace(/attribute/g, "in");
	code = code.replace("#version 120", "#version 330");
	code = code.replace(/texture2D/g, "texture");
	code = code.replace(/texture3D/g, "texture");
	code = code.replace(/textureCube/g, "texture");
	return code;
}

function convertPS120toPS330(code)
{
	code = code.replace(/varying/g, "in");
	code = code.replace("#version 120", "#version 330");
	code = code.replace(/texture2D/g, "texture");
	code = code.replace(/texture3D/g, "texture");
	code = code.replace(/textureCube/g, "texture");
	var outputs = 0;
	if (code.indexOf("gl_FragColor") != -1)
		outputs = 1;
	else
	{
		if (code.indexOf("gl_FragData[3]") != -1)
			outputs = 4;
		else if (code.indexOf("gl_FragData[2]") != -1)
			outputs = 3;
		else if (code.indexOf("gl_FragData[1]") != -1)
			outputs = 2;
		else if (code.indexOf("gl_FragData[0]") != -1)
			outputs = 1;
	}

	var psOut = "";

	for (var i = 0; i < outputs; i++) 
	{
		psOut += "out vec4 psOutput" + i + ";\n";
		if (i == 0)
			code = code.replace(/gl_FragColor/g, "psOutput" + i);
		code = code.replace(new RegExp("gl_FragData[" + i + "]", "g"), "psOutput" + i);
	}

	code = code.replace(/void main/g, psOut + "\nvoid main");
	return code;
}


function loaded()
{
	srcTxt = document.getElementById("hlsltxt");
	srcTxt.onkeyup = changed;
	srcTxt.onchange = changed;
	srcTxt.onblur = changed;
}


